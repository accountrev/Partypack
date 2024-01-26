/* eslint-disable no-case-declarations */
import { FULL_SERVER_ROOT } from "../Modules/Constants";
import { Router } from "express";
import { UserPermissions } from "../Schemas/User";
import { Song } from "../Schemas/Song";
import { RequireAuthentication, ValidateBody } from "../Modules/Middleware";
import { writeFileSync } from "fs";
import { ForcedCategory } from "../Schemas/ForcedCategory";
import ffmpeg from "fluent-ffmpeg";
import exif from "exif-reader";
import j from "joi";

const App = Router();

// ! ANY ENDPOINTS DEFINED IN THIS FILE WILL REQUIRE ADMIN AUTHORIZATION !
// ! ANY ENDPOINTS DEFINED IN THIS FILE WILL REQUIRE ADMIN AUTHORIZATION !
// ! ANY ENDPOINTS DEFINED IN THIS FILE WILL REQUIRE ADMIN AUTHORIZATION !

App.use(RequireAuthentication());

App.use((req, res, next) => {
    const IsAdmin = req.user!.PermissionLevel! >= UserPermissions.Administrator;
    if (req.path === "/key")
        return res.status(IsAdmin ? 200 : 403).send(IsAdmin ? "Login successful!" : "Key doesn't match. Try again.");

    if (!IsAdmin)
        return res.status(403).send("You don't have permission to access this endpoint.");

    next();
});

App.get("/tracks", async (_, res) => res.json((await Song.find()).map(x => x.Package())));

App.post("/create/song",
ValidateBody(j.object({
    ID: j.string().uuid(),
    Name: j.string().required().min(3).max(64),
    Year: j.number().required().min(1).max(2999),
    ArtistName: j.string().required().min(1).max(64),
    Length: j.number().required().min(1),
    Scale: j.string().valid("Minor", "Major").required(),
    Key: j.string().valid("A", "Ab", "B", "Bb", "C", "Cb", "D", "Db", "E", "Eb", "F", "Fb", "G", "Gb").required(),
    Album: j.string().required(),
    GuitarStarterType: j.string().valid("Keytar", "Guitar").required(),
    Tempo: j.number().min(20).max(1250).required(),
    Midi: j.string().uri(),
    Cover: j.string().uri(),
    Lipsync: j.string().uri(),
    BassDifficulty: j.number().required().min(0).max(7),
    GuitarDifficulty: j.number().required().min(0).max(7),
    DrumsDifficulty: j.number().required().min(0).max(7),
    VocalsDifficulty: j.number().required().min(0).max(7)
})),
async (req, res) => {
    res.json(await Song.create(req.body).save())
});

App.post("/upload/midi",
ValidateBody(j.object({
    Data: j.string().hex().required(),
    TargetSong: j.string().uuid().required()
})),
async (req, res) => {
    const Decoded = Buffer.from(req.body.Data, "hex");

    if (!Decoded.toString().startsWith("MThd"))
        return res.status(400).send("Uploaded MIDI file is not a valid MIDI.");

    if (!await Song.exists({ where: { ID: req.body.TargetSong } }))
        return res.status(404).send("The song you're trying to upload a MIDI for does not exist.");

    writeFileSync(`./Saved/Songs/${req.body.TargetSong}/Data.mid`, Decoded);
    res.send(`${FULL_SERVER_ROOT}/song/download/${req.body.TargetSong}/midi.mid`);
});

App.post("/upload/audio",
ValidateBody(j.object({
    Data: j.string().hex().required(),
    TargetSong: j.string().uuid().required()
})),
async (req, res) => {
    const Decoded = Buffer.from(req.body.Data, "hex");

    if (!await Song.exists({ where: { ID: req.body.TargetSong } }))
        return res.status(404).send("The song you're trying to upload audio for does not exist.");
})

App.post("/upload/cover",
ValidateBody(j.object({
    Data: j.string().hex().required(),
    TargetSong: j.string().uuid().required()
})),
async (req, res) => {
    const Decoded = Buffer.from(req.body.Data, "hex");

    if (!await Song.exists({ where: { ID: req.body.TargetSong } }))
        return res.status(404).send("The song you're trying to upload a cover for does not exist.");

    try { // todo: fix
        /*const ImageMetadata = exif(Decoded);
        if (!ImageMetadata.Image?.ImageWidth || !ImageMetadata.Image?.ImageLength)
            throw new Error("Invalid image file.");

        if (ImageMetadata.Image.ImageWidth !== ImageMetadata.Image.ImageLength)
            return res.status(400).send("Image must have a 1:1 ratio.");

        if (ImageMetadata.Image.ImageWidth < 512 || ImageMetadata.Image.ImageWidth > 2048)
            return res.status(400).send("Image cannot be smaller than 512 pixels and larger than 2048 pixels.");*/
    } catch (err) {
        console.error(err)
        return res.status(400).send("Invalid image file.");
    }

    writeFileSync(`./Saved/Songs/${req.body.TargetSong}/Cover.png`, Decoded);
    res.send(`${FULL_SERVER_ROOT}/song/download/${req.body.TargetSong}/cover.png`);
});

App.post("/update/discovery",
ValidateBody(j.array().items(j.object({
    ID: j.string().uuid().required(),
    Songs: j.array().items(j.string().uuid()).unique().min(1).max(20).required(),
    Priority: j.number().min(-50000).max(50000).required(),
    Header: j.string().min(3).max(125).required(),
    Action: j.string().valid("CREATE", "UPDATE", "DELETE").required()
})).max(100)),
async (req, res) => {
    const b = req.body as { ID: string, Songs: string[], Priority: number, Header: string, Action: "CREATE" | "UPDATE" | "DELETE" }[];
    const Failures: { Regarding: string, Message: string }[] = [];
    const Successes: { Regarding: string, Message: string }[] = [];

    for (const Entry of b) {
        switch (Entry.Action) {
            case "CREATE":
                const Songs = await Promise.all(Entry.Songs.map(x => Song.findOne({ where: { ID: x } })));
                if (Songs.includes(null)) {
                    Failures.push({ Regarding: Entry.ID, Message: `Creation request for custom category "${Entry.Header}" tried to request a non-existing song.` });
                    continue;
                }
                break;

            case "DELETE":
                const DBEntry = await ForcedCategory.findOne({ where: { ID: Entry.ID } });
                if (!DBEntry) {
                    Failures.push({ Regarding: Entry.ID, Message: `Custom category "${Entry.ID}" doesn't exist.` });
                    continue;
                }

                await DBEntry.remove();
                Successes.push({ Regarding: Entry.ID, Message: `Successfully removed "${Entry.ID}" from the database.` });
                break;

            case "UPDATE":
                break;
        }
    }

    res.status(Failures.length > Successes.length ? 400 : 200).json({
        Failures,
        Successes
    })
});

export default {
    App,
    DefaultAPI: "/admin/api"
}