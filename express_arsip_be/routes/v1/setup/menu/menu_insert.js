import express from "express";
import DB from "../../../../core/config/knex.js";
import { Logging } from "../../components/tools/servertool.js";
const router = express.Router();
router.post("/", async (req, res) => {
  try {
    const {
      id_peran,
      ...dataMenu
    } = req.body;
    const [id_menu] = await DB("mst_menu").insert({
      ...dataMenu,
      created_at: new Date(),
      updated_at: new Date()

    });
    if (id_peran) {
      const peranArray = Array.isArray(id_peran) ? id_peran : [id_peran];
      if (peranArray.length > 0) {
        const insertPeranMenu = peranArray.map(peran => ({
          id_menu: id_menu,
          id_peran: peran,
          created_at: new Date(),
          updated_at: new Date()

        }));
        await DB("mst_peran_menu").insert(insertPeranMenu);
      }
    }
    return res.status(200).json({
      message: "Menu berhasil ditambah!"
    });
  } catch (error) {
    const oResult = {
      error: error.message
    };
    Logging(error, {
      file: "menu_insert.js",
      func: "handler",
      request: req.body || {},
      response: oResult,
      user: ""
    });
    return res.status(500).json(oResult);
  }
});
export default router;
