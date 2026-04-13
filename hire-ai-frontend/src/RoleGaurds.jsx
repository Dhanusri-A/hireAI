import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { getRecruiterProfile } from "./api/api";

export const CandidateOnly = () => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/candidate-signin" replace />;
  }

  if (role !== "candidate") {
    return <Navigate to="*" replace />;
  }

  return <Outlet />;
};

export const RecruiterOnly = () => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || role !== "recruiter") {
      setProfileChecked(true);
      return;
    }
    setProfileChecked(false);
    getRecruiterProfile()
      .then((data) => setHasProfile(!!data))
      .catch(() => setHasProfile(false))
      .finally(() => setProfileChecked(true));
  }, [isAuthenticated, role, location.pathname]);

  if (loading || !profileChecked) return null;

  if (!isAuthenticated) {
    return <Navigate to="/recruiter-signin" replace />;
  }

  if (role !== "recruiter") {
    return <Navigate to="*" replace />;
  }

  const isSetupPage = location.pathname === "/recruiter/company-setup";

  if (!hasProfile && !isSetupPage) {
    return <Navigate to="/recruiter/company-setup" replace />;
  }

  if (hasProfile && isSetupPage) {
    return <Navigate to="/recruiter" replace />;
  }

  return <Outlet />;
};
