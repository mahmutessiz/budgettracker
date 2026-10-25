import { categoryTable } from "~~/server/db/schema";

export default defineEventHandler(async (event) => {
    await requireUser(event)
    const categories = db.select({
        id: categoryTable.id,
        name : categoryTable.name
    }).from(categoryTable);
    return categories;
})