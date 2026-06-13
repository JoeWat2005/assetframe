import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="flex justify-center px-5 py-16">
      <SignUp />
    </div>
  );
}
