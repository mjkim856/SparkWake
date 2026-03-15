"""
Gemini API Service
Ephemeral Token 발급 및 AI 코칭 생성
⚠️ API 키는 환경변수에서만 로드 - 절대 로깅 금지
"""
import datetime as dt
import json
from functools import lru_cache
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import get_settings
from app.models.report import AICoaching, AICoachingSuggestion


# 재시도 가능한 예외 타입
RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
)


@lru_cache
def get_gemini_client() -> genai.Client:
    """Cached Gemini client"""
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
)
async def create_ephemeral_token() -> dict:
    """
    Live API용 Ephemeral Token 발급
    공식 문서: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
    """
    client = get_gemini_client()
    now = dt.datetime.now(tz=dt.timezone.utc)
    
    # Ephemeral token 생성 (v1alpha API 사용)
    response = await client.aio.auth_tokens.create(
        config={
            "uses": 1,  # 1회 사용
            "expire_time": (now + dt.timedelta(minutes=30)).isoformat(),
            "new_session_expire_time": (now + dt.timedelta(minutes=5)).isoformat(),
            "http_options": {"api_version": "v1alpha"},
        }
    )
    
    return {
        "token": response.name,  # token.name이 실제 토큰 값
        "expires_at": response.expire_time.isoformat() if hasattr(response, 'expire_time') and response.expire_time else None,
    }


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
)
async def generate_ai_coaching(weekly_data: list[dict]) -> AICoaching:
    """
    주간 데이터 기반 AI 코칭 생성
    """
    client = get_gemini_client()
    
    prompt = f"""
사용자의 지난 7일 루틴 데이터를 분석해주세요:
{json.dumps(weekly_data, ensure_ascii=False, indent=2)}

다음 기준으로 2-3개의 맞춤형 제안을 해주세요:
1. 스킵률 높은 루틴 → 시간 단축 또는 대체 제안
2. 특정 요일 패턴 → 요일별 맞춤 조정
3. 잘하고 있는 점 → 칭찬과 격려

JSON 형식으로만 응답해주세요:
{{
  "suggestions": [
    {{
      "id": "1",
      "type": "time_adjust",
      "message": "수요일에 명상을 자주 스킵하시네요. 10분에서 5분으로 줄여볼까요?",
      "action": {{
        "routine_id": "xxx",
        "field": "duration",
        "old_value": 10,
        "new_value": 5
      }}
    }}
  ]
}}
"""
    
    response = await client.aio.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    
    try:
        data = json.loads(response.text)
        suggestions = [
            AICoachingSuggestion(**s) for s in data.get("suggestions", [])
        ]
    except (json.JSONDecodeError, KeyError):
        # 파싱 실패 시 기본 격려 메시지
        suggestions = [
            AICoachingSuggestion(
                id="default",
                type="encouragement",
                message="이번 주도 열심히 하셨어요! 계속 화이팅!",
            )
        ]
    
    return AICoaching(
        suggestions=suggestions,
        generated_at=dt.datetime.now(tz=dt.timezone.utc),
    )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
)
async def generate_daily_summary(
    today_results: list[dict],
    weekly_history: list[dict],
) -> str:
    """
    오늘 루틴 결과와 주간 히스토리를 분석하여 개인화된 AI 코칭 요약 생성
    FR-9: AI Daily Summary
    """
    client = get_gemini_client()
    
    # 연속 완료 기록 계산
    streaks = {}
    for result in today_results:
        routine_name = result.get("routineName", "")
        if result.get("status") == "completed":
            # 과거 기록에서 연속 완료 일수 계산
            streak = 1
            for day in weekly_history:
                day_results = day.get("routineResults", [])
                found = False
                for r in day_results:
                    if r.get("routineName") == routine_name and r.get("status") == "completed":
                        streak += 1
                        found = True
                        break
                if not found:
                    break
            streaks[routine_name] = streak
    
    # 스킵 패턴 분석
    skip_patterns = {}
    for result in today_results:
        routine_name = result.get("routineName", "")
        if result.get("status") == "skipped":
            recent_skips = 1
            for day in weekly_history[:3]:  # 최근 3일
                day_results = day.get("routineResults", [])
                for r in day_results:
                    if r.get("routineName") == routine_name and r.get("status") == "skipped":
                        recent_skips += 1
                        break
            if recent_skips >= 2:
                skip_patterns[routine_name] = recent_skips
    
    prompt = f"""당신은 친근하고 격려하는 아침 루틴 코치입니다. 사용자의 오늘 루틴 결과와 최근 기록을 분석하여 개인화된 코칭 메시지를 작성해주세요.

## 오늘 결과
{json.dumps(today_results, ensure_ascii=False, indent=2)}

## 연속 완료 기록 (오늘 포함)
{json.dumps(streaks, ensure_ascii=False) if streaks else "없음"}

## 최근 스킵 패턴 (최근 3일 기준)
{json.dumps(skip_patterns, ensure_ascii=False) if skip_patterns else "없음"}

## 작성 가이드
1. 오늘 성과 칭찬 (완료율, 완료 개수 언급)
2. 잘하고 있는 점 (연속 기록이 있으면 강조, 🔥 이모지 사용)
3. 개선 포인트 (스킵 패턴이 있으면 부드럽게 언급, 대안 제시)
4. 격려 마무리

## 규칙
- 톤: 친근하고 격려하는 말투
- 길이: 3-5문장 (100자 내외)
- 이모지: 적절히 사용 (👏 🔥 💪 등)
- 언어: 한국어
- 형식: 줄바꿈 없이 자연스러운 문단으로

메시지만 출력하세요 (JSON 아님):"""

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    
    summary = response.text.strip()
    
    # 빈 응답이면 기본 메시지
    if not summary:
        completed = sum(1 for r in today_results if r.get("status") == "completed")
        total = len(today_results)
        rate = round(completed / total * 100) if total > 0 else 0
        summary = f"오늘 {total}개 중 {completed}개 완료, {rate}% 달성! 👏 내일도 화이팅! 💪"
    
    return summary
