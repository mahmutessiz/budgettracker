import { categoryTable } from "~~/server/db/schema";

export default defineEventHandler(async (event) =>{
    await requireUser(event)
    const body = await readBody(event);

    const addCategory = db.insert(categoryTable)
    .values({name: body.name})
    .returning()
    .get();

    setResponseStatus(event, 201);
    return addCategory;
})