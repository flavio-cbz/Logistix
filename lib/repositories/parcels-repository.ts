import { eq } from "drizzle-orm";
import { BaseRepository } from "./base-repository";
import { parcels, type SuperbuyParcel, type NewSuperbuyParcel } from "@/lib/database/schema";

export class ParcelsRepository extends BaseRepository<
  typeof parcels,
  SuperbuyParcel,
  NewSuperbuyParcel
> {
  /**
   * Find all parcels for a specific user
   */
  public async findByUserId(userId: string): Promise<SuperbuyParcel[]> {
    return this.findAll({
      where: eq(parcels.userId, userId),
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  }

  /**
   * Upsert multiple parcels
   */
  public async upsertMany(data: NewSuperbuyParcel[]): Promise<void> {
    if (data.length === 0) return;

    await this.executeCustomTransaction((db) => {
      for (const item of data) {
        const insertData = this.addTimestamps(item, "create");
        
        const existing = db
          .select()
          .from(parcels)
          .where(eq(parcels.superbuyId, item.superbuyId))
          .get();

        if (existing) {
          // Update
          const updateData = this.addTimestamps(item, "update");
          delete updateData.id;
          delete updateData.createdAt;
          
          db.update(parcels)
            .set(updateData)
            .where(eq(parcels.id, existing.id))
            .run();
        } else {
          // Insert
          db.insert(parcels).values(insertData).run();
        }
      }
    });
  }
}
