import { randomUUID } from "crypto";
import { dbConnect, sql } from "@/utils/dbconnect";

const mapUser = (row) =>
  row
    ? {
        _id: row.id,
        userName: row.user_name,
        email: row.email,
        password: row.password,
        imageUrl: row.image_url,
        resetPasswordToken: row.reset_password_token,
        resetPasswordExpires: row.reset_password_expires,
        isVerified: row.is_verified,
        verificationToken: row.verification_token,
        verificationTokenExpires: row.verification_token_expires,
        userData: row.user_data_id,
      }
    : null;

const User = {
  async findOne(query) {
    await dbConnect();
    let rows;
    if (query.email) {
      rows = await sql`SELECT * FROM users WHERE email = ${query.email} LIMIT 1`;
    } else if (query.resetPasswordToken) {
      rows = await sql`
        SELECT * FROM users
        WHERE reset_password_token = ${query.resetPasswordToken}
          AND reset_password_expires > ${query.resetPasswordExpires?.$gt ?? new Date()}
        LIMIT 1
      `;
    } else {
      rows = await sql`SELECT * FROM users WHERE id = ${query._id} LIMIT 1`;
    }
    return mapUser(rows[0]);
  },
  async findById(id) {
    await dbConnect();
    const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return mapUser(rows[0]);
  },
  async create(input) {
    await dbConnect();
    const id = randomUUID();
    const rows = await sql`
      INSERT INTO users
        (id, user_name, email, password, image_url, is_verified, user_data_id)
      VALUES
        (${id}, ${input.userName}, ${input.email}, ${input.password ?? null},
         ${input.imageUrl}, ${input.isVerified ?? false}, ${input.userData ?? input.userDataId ?? null})
      RETURNING *
    `;
    return mapUser(rows[0]);
  },
  async findByIdAndUpdate(id, updates) {
    await dbConnect();
    const rows = await sql`
      UPDATE users
      SET password = COALESCE(${updates.password ?? null}, password),
          reset_password_token = CASE WHEN ${updates.resetPasswordToken === undefined} THEN reset_password_token ELSE ${updates.resetPasswordToken} END,
          reset_password_expires = CASE WHEN ${updates.resetPasswordExpires === undefined} THEN reset_password_expires ELSE ${updates.resetPasswordExpires} END,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return mapUser(rows[0]);
  },
};

export default User;
