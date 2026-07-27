from __future__ import annotations

from enum import StrEnum

from unigreen.domain.enums import StaffRole


class Permission(StrEnum):
    CATALOGUE_READ = "catalogue:read"
    CATALOGUE_WRITE = "catalogue:write"
    CATALOGUE_PUBLISH = "catalogue:publish"


ROLE_PERMISSIONS: dict[StaffRole, frozenset[Permission]] = {
    StaffRole.SALES_STAFF: frozenset({Permission.CATALOGUE_READ}),
    StaffRole.SALES_MANAGER: frozenset({Permission.CATALOGUE_READ}),
    StaffRole.CONTENT_EDITOR: frozenset(
        {
            Permission.CATALOGUE_READ,
            Permission.CATALOGUE_WRITE,
            Permission.CATALOGUE_PUBLISH,
        }
    ),
    StaffRole.ADMINISTRATOR: frozenset(Permission),
}


def permissions_for(role: StaffRole) -> frozenset[Permission]:
    return ROLE_PERMISSIONS[role]


def has_permission(role: StaffRole, permission: Permission) -> bool:
    return permission in permissions_for(role)
