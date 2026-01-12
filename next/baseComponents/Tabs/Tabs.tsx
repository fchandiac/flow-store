"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabItem {
  href: string;
  label: string;
  exact?: boolean;
}

interface TabsProps {
  items: TabItem[];
  basePath?: string;
  className?: string;
}

const defaultClasses = "flex";

const Tabs: React.FC<TabsProps> = ({ items, basePath, className }) => {
  const pathname = usePathname();
  const containerClass = className ? `${defaultClasses} ${className}`.trim() : defaultClasses;

  return (
    <nav className={containerClass} data-test-id="tabs-root">
      {items.map((tab) => {
        const isExact = tab.exact ?? false;
        const isRootTab = basePath ? tab.href === basePath : false;
        const active = isExact
          ? pathname === tab.href
          : pathname === tab.href || (!isRootTab && pathname.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={` inline-flex items-center border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
            aria-current={active ? "page" : undefined}
            prefetch
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default Tabs;
