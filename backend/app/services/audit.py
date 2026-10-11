from sqlalchemy.orm import Session

from app.models import AuditLog


def record(db: Session, actor_id: int | None, action: str, target_type: str | None = None,
           target_id: int | str | None = None, meta: dict | None = None) -> None:
    """Add an audit row to the current transaction (caller commits)."""
    db.add(AuditLog(actor_id=actor_id, action=action, target_type=target_type,
                    target_id=str(target_id) if target_id is not None else None, meta=meta))
