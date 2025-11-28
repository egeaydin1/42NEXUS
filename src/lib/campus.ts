import { fetch42 } from "@/lib/api";

export async function getIstanbulId() {
    const campuses = await fetch42("/campus?page[size]=100");
    const istanbul = campuses.find((c: any) => c.name.toLowerCase().includes("istanbul"));
    console.log("Istanbul Campus:", istanbul);
    return istanbul?.id;
}
