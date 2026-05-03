"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const { name, email } = session.user;
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (email?.[0]?.toUpperCase() ?? "?");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors outline-none cursor-pointer">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarFallback className="rounded-lg text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:grid text-left text-sm leading-tight">
          <span className="truncate font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut />
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
