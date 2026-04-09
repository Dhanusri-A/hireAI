"""merge migration heads

Revision ID: 09fcba54aa7b
Revises: b8d946270494, f4ce555e26b8
Create Date: 2026-03-16 08:14:39.326026

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09fcba54aa7b'
down_revision: Union[str, None] = ('b8d946270494', 'f4ce555e26b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
