import "./globals.css";
import AntdRegistry from "@/components/AntdRegistry";
import AppLayout from "@/components/AppLayout";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata = {
  title: "Itadaki CRM",
  description: "人材紹介事業向けCRMシステム",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <AntdRegistry>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
