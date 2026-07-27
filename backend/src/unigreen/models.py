"""Import model modules so Alembic sees all application metadata."""

from unigreen.audit.models import AuditEvent as AuditEvent
from unigreen.auth.models import StaffSession as StaffSession
from unigreen.catalogue.models import Product as Product
from unigreen.catalogue.models import ProductCategory as ProductCategory
from unigreen.catalogue.models import ProductCategoryLink as ProductCategoryLink
from unigreen.catalogue.models import (
    ProductCategoryTranslation as ProductCategoryTranslation,
)
from unigreen.catalogue.models import ProductSpecification as ProductSpecification
from unigreen.catalogue.models import (
    ProductSpecificationTranslation as ProductSpecificationTranslation,
)
from unigreen.catalogue.models import ProductTranslation as ProductTranslation
from unigreen.media.models import ProductMedia as ProductMedia
from unigreen.staff.models import StaffUser as StaffUser
