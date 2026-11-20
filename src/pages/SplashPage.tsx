/** S06 스플래시 (Figma 08_v2_UI). */
export function SplashPage() {
  return <main aria-label="NUTORI" className="relative mx-auto h-svh max-w-[390px] overflow-hidden bg-linear-to-b from-[#1e6beb] to-[#0053de] text-center text-white">
    <div className="absolute inset-x-0 top-[247px]">
      <img src="/images/tori/nutori-logo.svg" alt="NUTORI" width="265.957" height="89" className="mx-auto" />
      <p className="mt-[10px] text-lg leading-5 font-medium">나에게 맞는 뉴스를 더 쉽고 편하게</p>
    </div>
    <img src="/images/tori/splash-character.png" alt="" aria-hidden="true" width="765" height="699"
      className="absolute top-[440px] left-1/2 h-[699px] w-[765px] max-w-none -translate-x-1/2 object-cover" />
  </main>
}
