"""Adds village/area/city/state/country to donors, receivers and hospitals, and the password_resets table."""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    from app.database import Base
    from app.utils.migrate import add_missing_columns
    import app.models  # noqa: F401
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)
    add_missing_columns(bind.engine if hasattr(bind, "engine") else bind, Base)


def downgrade():
    pass
