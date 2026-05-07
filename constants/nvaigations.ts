type NavItem = {
  label: string;
  href: string;
  disabled: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/company", disabled: false },
  { label: "Modules", href: "/company/modules", disabled: false },
  { label: "Employees", href: "/company/team", disabled: false },
  { label: "Settings", href: "/company/settings", disabled: false },
];
