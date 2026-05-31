import GuestPageContainer from "@/components/common/GuestPageContainer";

export default function AuthPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestPageContainer centered maxWidth="md">
      {children}
    </GuestPageContainer>
  );
}
