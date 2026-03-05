"""
Firestore Service
Firestore 클라이언트 관리
"""
from functools import lru_cache
from google.cloud import firestore


@lru_cache
def get_firestore_client() -> firestore.Client:
    """Cached Firestore client"""
    return firestore.Client()
