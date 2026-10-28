import { IssueDetail } from "@/components/issue-detail";
import { ISSUES } from "@/lib/demo-data";

export function generateStaticParams() {
  return Object.values(ISSUES).map((issue) => ({
    number: String(issue.number),
  }));
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;

  return <IssueDetail number={Number(number)} />;
}
