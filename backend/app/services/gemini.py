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
        generated_at=dt.datetime.utcnow(),
    )
