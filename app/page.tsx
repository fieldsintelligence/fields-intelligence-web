import { Founder } from "@/components/Founder";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { ProductDemo } from "@/components/ProductDemo";
import { Products } from "@/components/Products";
import { Proof } from "@/components/Proof";
import { TrustBoundary } from "@/components/TrustBoundary";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Proof />
      <Products />
      <ProductDemo />
      <TrustBoundary />
      <Founder />
    </>
  );
}
