import { BarChart3, CircleHelp, HeartHandshake, Home, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "首页", icon: Home },
  { to: "/reports", label: "趋势", icon: BarChart3 },
  { to: "/checkin", label: "记录", icon: Plus, center: true },
  { to: "/companion", label: "陪伴", icon: HeartHandshake },
  { to: "/help", label: "求助", icon: CircleHelp }
];

export function BottomNav({ locked = false, insufficient = false }: { locked?: boolean; insufficient?: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map(({ to, label, icon: Icon, center }) => (
        <NavLink
          key={to}
          to={insufficient && to === "/companion" ? "/checkin" : to}
          state={insufficient && to === "/companion" ? { gateNotice: "先完成几次记录，再使用陪伴。" } : undefined}
          className={({ isActive }) => `nav-item ${center ? "nav-item-center" : ""} ${locked && to !== "/help" ? "is-locked" : ""} ${insufficient && to === "/companion" ? "is-gated" : ""} ${isActive ? "is-active" : ""}`}
          aria-disabled={locked && to !== "/help" ? "true" : undefined}
          title={label}
          onClick={(event) => {
            if (locked && to !== "/help") event.preventDefault();
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
