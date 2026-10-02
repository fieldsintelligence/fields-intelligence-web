import { Founder } from "@/components/Founder";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Proof } from "@/components/Proof";
import { TrustBoundary } from "@/components/TrustBoundary";
import { UseCases } from "@/components/UseCases";
import { ZeroRetention } from "@/components/ZeroRetention";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Proof />
      <ZeroRetention />
      <UseCases />
      <TrustBoundary />
      <Founder />
    </>
  );
}
