const ROLES = [
    'super_admin',
    'client_admin',
    'client_viewer'
]

const CLIENT_ROLES = [
    'client_admin',
    'client_viewer'
]

const APPLICATION_ROLES = {
    SUPER_ADMIN: 'super_admin',
    CLIENT_ADMIN: 'client_admin',
    CLIENT_VIEWER: 'client_viewer',
}

const isValidClientRole = (role) => CLIENT_ROLES.includes(role)

const isValidApplicationRole = (role) => APPLICATION_ROLES.includes(role)

const isValidRole = (role) => ROLES.includes(role)

export {
    isValidRole,
    isValidApplicationRole,
    isValidClientRole
}

export {
    ROLES,
    CLIENT_ROLES,
    APPLICATION_ROLES
}