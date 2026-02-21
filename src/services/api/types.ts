export type Role = "ADMIN" | "VET" | "RECEPTION";

export type UserResponseWithRole = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};
