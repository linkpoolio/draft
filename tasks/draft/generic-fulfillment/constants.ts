// NB: keep them case sensitive; matching the contracts one
export enum AccessControlRole {
  CONSUMER_ROLE = "CONSUMER_ROLE",
  DEFAULT_ADMIN_ROLE = "DEFAULT_ADMIN_ROLE",
}

export enum TaskExecutionMode {
  FORKING = "forking", // Executed on an instance of Hardhat Network that forks another network
  PROD = "prod", // Executed on a network
}

export enum TaskSetName {
  CANCEL_REQUEST = "cancel_request",
  SET_ROLES = "set_roles",
  SET_STUFF = "set_stuff",
  WITHDRAW = "withdraw",
}

export enum TaskSetRolesAction {
  GRANT = "grant",
  REVOKE = "revoke",
}
