import { NewPetForm } from './form';

// PRD §6.1, §11.1: 펫 프로필 등록 (이름·견종·체중·연령·이동제한)

export default function NewPetPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-1 text-xl font-bold">반려견 등록</h1>
      <p className="mb-6 text-xs text-gray-500">
        체중과 이동제한 정보를 정확히 입력하면 더 알맞은 코스를 추천해드릴 수 있어요.
      </p>
      <NewPetForm />
    </main>
  );
}
