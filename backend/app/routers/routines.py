"""
Routines Router
루틴 CRUD 엔드포인트
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.models.routine import Routine, RoutineCreate, RoutineUpdate
from app.services.auth import get_current_user
from app.services.firestore import get_firestore_client

router = APIRouter()


def _get_routines_ref(db: firestore.Client, user_id: str):
    """사용자의 루틴 컬렉션 참조"""
    return db.collection("users").document(user_id).collection("routines")


@router.get("", response_model=list[Routine])
async def list_routines(
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 목록 조회 (시작 시간 순)"""
    routines_ref = _get_routines_ref(db, user_id)
    docs = routines_ref.order_by("start_time").stream()
    
    return [
        Routine(id=doc.id, user_id=user_id, **doc.to_dict())
        for doc in docs
    ]


@router.post("", response_model=Routine, status_code=status.HTTP_201_CREATED)
async def create_routine(
    routine: RoutineCreate,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 생성"""
    routines_ref = _get_routines_ref(db, user_id)
    
    # 최대 20개 제한 확인
    existing_count = len(list(routines_ref.stream()))
    if existing_count >= 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 20 routines allowed",
        )
    
    now = datetime.utcnow()
    data = {
        **routine.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    
    doc_ref = routines_ref.document()
    doc_ref.set(data)
    
    return Routine(id=doc_ref.id, user_id=user_id, **data)


@router.get("/{routine_id}", response_model=Routine)
async def get_routine(
    routine_id: str,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 상세 조회"""
    doc = _get_routines_ref(db, user_id).document(routine_id).get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found",
        )
    
    return Routine(id=doc.id, user_id=user_id, **doc.to_dict())


@router.put("/{routine_id}", response_model=Routine)
async def update_routine(
    routine_id: str,
    routine: RoutineUpdate,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 수정"""
    doc_ref = _get_routines_ref(db, user_id).document(routine_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found",
        )
    
    update_data = routine.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    doc_ref.update(update_data)
    
    updated_doc = doc_ref.get()
    return Routine(id=updated_doc.id, user_id=user_id, **updated_doc.to_dict())


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routine(
    routine_id: str,
    user_id: str = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
):
    """루틴 삭제"""
    doc_ref = _get_routines_ref(db, user_id).document(routine_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found",
        )
    
    doc_ref.delete()
