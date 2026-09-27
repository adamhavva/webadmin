import { PaymentMethodListPage } from "@/components/settings/payment-method-list-page";
import { SettingListPage } from "@/components/settings/setting-list-page";

export default function SettingsRoutePage() {
  return (
    <div className="space-y-8">
      <SettingListPage />
      <PaymentMethodListPage />
    </div>
  );
}
