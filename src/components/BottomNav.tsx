import { BarChart3, ClipboardPenLine, Compass, Home, LifeBuoy, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "首页", icon: Home },
  { to: "/checkin", label: "记录", icon: ClipboardPenLine },
  { to: "/reports", label: "趋势", icon: BarChart3 },
  { to: "/help", label: "求助", icon: LifeBuoy },
  { to: "/settings", label: "设置", icon: Settings2 }
];

export function BottomNav({ locked = false }: { locked?: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
          aria-disabled={locked && to !== "/help" ? "true" : undefined}
          onClick={(event) => {
            if (locked && to !== "/help") event.preventDefault();
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
      <NavLink
        to="/rules"
        className={`nav-item nav-item-lab ${locked ? "is-locked" : ""}`}
        aria-label="规则实验室"
        aria-disabled={locked ? "true" : undefined}
        tabIndex={locked ? -1 : undefined}
        onClick={(event) => {
          if (locked) event.preventDefault();
        }}
      >
        <Compass size={18} strokeWidth={1.8} />
        <span>规则</span>
      </NavLink>
    </nav>
  );
}
