import { NoticeProvider } from "./notice";
import { SiteHeader } from "./site-header";

export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <NoticeProvider>{children}</NoticeProvider>
    </>
  );
}
