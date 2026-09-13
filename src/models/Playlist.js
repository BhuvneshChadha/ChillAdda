import { randomUUID } from "crypto";
import { dbConnect, sql } from "@/utils/dbconnect";

const mapPlaylist = (row) =>
  row
    ? {
        _id: row.id,
        name: row.name,
        songs: row.songs ?? [],
        user: row.user_id,
      }
    : null;

const Playlist = {
  async create(input) {
    await dbConnect();
    const id = randomUUID();
    const rows = await sql`
      INSERT INTO playlists (id, name, user_id)
      VALUES (${id}, ${input.name}, ${input.user})
      RETURNING *
    `;
    return mapPlaylist(rows[0]);
  },
  async findById(id) {
    await dbConnect();
    const rows = await sql`SELECT * FROM playlists WHERE id = ${id} LIMIT 1`;
    return mapPlaylist(rows[0]);
  },
  async findByIdAndUpdate(id, update) {
    await dbConnect();
    const current = await Playlist.findById(id);
    if (!current) return null;
    const songs = update.$push?.songs
      ? [...current.songs, update.$push.songs]
      : update.$pull?.songs
        ? current.songs.filter((song) => song !== update.$pull.songs)
        : current.songs;
    const rows = await sql`
      UPDATE playlists
      SET songs = ${JSON.stringify(songs)}::jsonb, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return mapPlaylist(rows[0]);
  },
  async deleteOne({ _id }) {
    await dbConnect();
    await sql`DELETE FROM playlists WHERE id = ${_id}`;
  },
};

export default Playlist;
