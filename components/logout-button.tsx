"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
    const { logout, isAuthenticated } = useAuth()

    if (!isAuthenticated) {
        return null
    }

    return (
        <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
        </Button>
    )
}
