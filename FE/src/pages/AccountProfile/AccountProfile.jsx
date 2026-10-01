import { useAuth } from "../../lib/AuthContext";
import ProfileCard from "./components/ProfileCard";
import FirmOptions from "./components/FirmOptions";
import FirmCard from "./components/FirmCard";
import PendingBanner from "./components/PendingBanner";

function AccountProfile() {
  const { user } = useAuth();

  const hasFirm = Boolean(user?.firmName);
  const pendingFirm = !hasFirm && Boolean(user?.pendingFirmId);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Account Profile</h1>
        <p className="text-sm text-text-muted">Your account and firm</p>
      </div>

      <ProfileCard account={user} />

      {pendingFirm ? (
        <PendingBanner
          firmName={user.pendingFirmName}
          firmId={user.pendingFirmId}
        />
      ) : hasFirm ? (
        <FirmCard firmName={user.firmName} firmId={user.firmId} role={user.role} />
      ) : (
        <FirmOptions />
      )}
    </div>
  );
}

export default AccountProfile;
