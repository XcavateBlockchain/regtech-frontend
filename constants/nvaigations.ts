type NavItem = {
  label: string;
  href: string;
  disabled: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", disabled: false },
  { label: "Modules", href: "/modules", disabled: false },
  { label: "Team", href: "/team", disabled: false },
  { label: "Users", href: "/users", disabled: false },
  { label: "Analytics", href: "/analytics", disabled: false },
  { label: "Settings", href: "/settings", disabled: false },
];
