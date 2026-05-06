import { useState } from "react";
import { ModalContent } from "@/components/modal";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

export function AuthModal() {
  const [page, setPage] = useState<number>(0);

  const pages: Record<number, React.ReactNode> = {
    0: <LoginForm setPage={setPage} />,
    1: <SignupForm setPage={setPage} />,
  };

  return (
    <ModalContent>
      {pages[page]}
      <p className="text-center text-muted-foreground text-xs">
        By signing up you agree to our{" "}
        <a className="underline hover:no-underline" href="/#">
          Terms
        </a>
        .
      </p>
    </ModalContent>
  );
}
