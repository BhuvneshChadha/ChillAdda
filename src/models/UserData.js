import { randomUUID } from "crypto";
import { dbConnect, sql } from "@/utils/dbconnect";

const mapData = (row) =>
  row
    ? {
        _id: row.id,
        favourites: row.favourites ?? [],
        songHistory: row.song_history ?? [],
        playlists: row.playlists ?? [],
        language: row.languages ?? [],
        async updateOne(update) {
          const favourites = update.$pull
            ? this.favourites.filter((item) => item !== update.$pull.favourites)
            : update.$push
              ? [...this.favourites, update.$push.favourites]
              : this.favourites;
          await sql`UPDATE user_data SET favourites = ${JSON.stringify(favourites)}::jsonb, updated_at = NOW() WHERE id = ${this._id}`;
          this.favourites = favourites;
        },
        async save() {
          await sql`
            UPDATE user_data
            SET favourites = ${JSON.stringify(this.favourites)}::jsonb,
                song_history = ${JSON.stringify(this.songHistory)}::jsonb,
                languages = ${JSON.stringify(this.language)}::jsonb,
                playlists = ${JSON.stringify(this.playlists)}::jsonb,
                updated_at = NOW()
            WHERE id = ${this._id}
          `;
        },
      }
    : null;

const UserData = {
  async create() {
    await dbConnect();
    const id = randomUUID();
    const rows = await sql`INSERT INTO user_data (id) VALUES (${id}) RETURNING *`;
    return mapData(rows[0]);
  },
  async findById(id) {
    await dbConnect();
    const rows = await sql`SELECT * FROM user_data WHERE id = ${id} LIMIT 1`;
    return mapData(rows[0]);
  },
};

export default UserData;
