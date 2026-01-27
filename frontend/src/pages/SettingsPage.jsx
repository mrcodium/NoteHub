import React from "react"
import { Outlet } from "react-router-dom"
import { Palette, UserRound, Image, Lock } from "lucide-react"

import { ExpandedTabs } from "@/components/ui/expanded-tabs"

const SettingsPage = () => {
  const tabs = [
    {
      label: "Appearance",
      icon: Palette,
      path: "/settings/appearance",
    },
    {
      label: "Profile",
      icon: UserRound,
      path: "/settings/profile",
    },
    {
      label: "Photos",
      icon: Image,
      path: "/settings/photos",
    },
    {
      label: "Security",
      icon: Lock,
      path: "/settings/security",
    },
  ]

  return (
    <div className="w-full">
      <div className="p-4 max-w-screen-md mx-auto space-y-6">
        {/* Expandable Tabs */}
        <ExpandedTabs tabs={tabs} />

        {/* Routed content */}
        <Outlet />
      </div>
    </div>
  )
}

export default SettingsPage
