import { Bell, ChevronDown, ImageIcon, Info } from "lucide-react";

const Icon = {
  bell: Bell,
  arrowDown: ChevronDown,
  info: Info,
  image: ImageIcon,
};

export type IconName = keyof typeof Icon;
export default Icon;
