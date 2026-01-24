import React from "react";
import { Outlet } from "react-router-dom";

const SettingsPage = () => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="p-4 max-w-screen-md w-full m-auto bg-[#f5f5f5] dark:bg-background">
        <Outlet />
      </div>
    </div>
  );
};

export default SettingsPage;
