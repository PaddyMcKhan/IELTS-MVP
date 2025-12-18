import { Suspense } from "react";
import SpeakingPracticeClient from "./SpeakingPracticeClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SpeakingPracticeClient />
    </Suspense>
  );
}
