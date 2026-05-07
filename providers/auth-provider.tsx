"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Modal, ModalContent } from "@/components/modal";
import { CreateCompanyForm } from "@/features/auth/create-company-from";
import { LoginForm } from "@/features/auth/login-form";
import { SigninOptions } from "@/features/auth/signin-options";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { getUserByWallet } from "@/lib/actions/user";

type AuthPage = 0 | 1 | 2;
type AuthIntent = "login" | "register-owner";

const CloseIcon = () => (
  <svg
    aria-hidden="true"
    width="16px"
    height="16px"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 5L19 19M19 5L5 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    ></path>
  </svg>
);

export const storageKeys = {
  role: "ROLE",
  user: "USER_ID",
  company: "COMPANY_ID",
  employee: "EMPLOYEE_ID",
};

const AuthContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activePage: number;
  setActivePage: React.Dispatch<React.SetStateAction<AuthPage>>;
  accountLoading: boolean;
  setAccountLoading: React.Dispatch<React.SetStateAction<boolean>>;
  intent: AuthIntent;
  setIntent: React.Dispatch<React.SetStateAction<AuthIntent>>;
}>({
  open: false,
  setOpen: () => false,
  activePage: 0,
  setActivePage: () => 0,
  accountLoading: false,
  setAccountLoading: () => false,
  intent: "login",
  setIntent: () => "login",
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activePage, setActivePage] = useState<AuthPage>(0);
  const [intent, setIntent] = useState<AuthIntent>("login");
  const { isConnected, address } = useWalletKit();
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      const user = localStorage.getItem(storageKeys.user);
      if (!user) {
        const timeout = setTimeout(() => {
          setAccountLoading(true);
        }, 320);

        return () => clearTimeout(timeout);
      }
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (accountLoading && address) {
      let ignore = false;
      setOpen(true);
      const checkUser = async () => {
        const user = await getUserByWallet(address ?? "");
        console.log(user);
        if (ignore) return;
        if (!user) {
          if (intent === "register-owner") {
            setActivePage(2);
          }
          setAccountLoading(false);
          return;
        }
        localStorage.setItem(storageKeys.role, user?.role ?? "");
        localStorage.setItem(storageKeys.user, user?.userId ?? "");
        localStorage.setItem(storageKeys.company, user?.companyId ?? "");
        // If a user exists, close the auth modal (edge-case: accountLoading flow
        // can open it while a sign-in is in progress).
        setOpen(false);
        setActivePage(0);
        setAccountLoading(false);
      };
      checkUser();
      return () => {
        ignore = true;
      };
    }
  }, [accountLoading, address, intent]);

  const pages: Record<AuthPage, React.ReactNode> = {
    0: <SigninOptions />,
    1: <LoginForm />,
    2: <CreateCompanyForm />,
  };

  return (
    <AuthContext.Provider
      value={{
        open,
        setOpen,
        activePage,
        setActivePage,
        accountLoading,
        setAccountLoading,
        intent,
        setIntent,
      }}
    >
      {children}
      <Modal
        open={open}
        onOpenChange={setOpen}
        // biome-ignore lint/complexity/noUselessTernary: disable pointer dismissal for create company page
        disablePointerDismissal={pages[activePage] === 2 ? true : false}
      >
        <ModalContent
          showCloseButton={false}
          className="md:max-w-[min(400px,calc(100vw-32px))] gap-6 sm:rounded-[20px] border-0 p-4 shadow-none"
        >
          {pages[activePage] === 2 ? null : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="hover:bg-secondary absolute top-4 right-4 rounded-lg p-1.5 transition-colors md:block hidden"
            >
              <CloseIcon />
            </button>
          )}
          {accountLoading ? <ProfileLoading /> : pages[activePage]}
          <p className="text-center text-muted-foreground text-xs">
            By signing up you agree to our{" "}
            <a className="underline hover:no-underline" href="/#">
              Terms
            </a>
            .
          </p>
        </ModalContent>
      </Modal>
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}

export function ProfileLoading() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-9 md:pt-5">
      <div className="size-[116px] relative flex items-center justify-center rounded-2xl border p-3">
        {/** biome-ignore lint/performance/noImgElement: <\> */}
        <img
          src={"/main_logo.svg"}
          alt="Regtech"
          className="size-full overflow-hidden animate-pulse rounded-2xl"
        />
      </div>

      <div className="space-y-3.5 px-3.5 text-center sm:px-0">
        <h1 className="text-xl font-semibold">{"Fetching profile..."}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {"Please wait while we fetch your profile..."}
        </p>
      </div>
    </div>
  );
}
