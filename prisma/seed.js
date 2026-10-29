const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Menyemak dan menyelaraskan saiz baju lalai (default shirt sizes)...');

  // 1. Shirt Sizes (Sentiasa di-upsert untuk production mahupun development)
  const sizes = [
    { name: 'S', color: '#0284c7', sortOrder: 1 },
    { name: 'M', color: '#3b82f6', sortOrder: 2 },
    { name: 'L', color: '#10b981', sortOrder: 3 },
    { name: 'XL', color: '#f59e0b', sortOrder: 4 },
    { name: 'XXL', color: '#9333ea', sortOrder: 5 },
    { name: 'XXXL', color: '#e11d48', sortOrder: 6 },
  ];

  for (const s of sizes) {
    await prisma.shirtSize.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log('Saiz baju berjaya diselaraskan.');

  // 2. Demo data: Hanya dimasukkan jika SEED_DEMO=true atau argumen --demo
  const isDemo = process.env.SEED_DEMO === 'true' || process.argv.includes('--demo');

  if (isDemo) {
    console.log('SEED_DEMO diaktifkan. Memasukkan bilik, team, dan peserta contoh...');

    // Default Rooms
    const rooms = [
      { name: 'Bilik Melati (101)', capacity: 4 },
      { name: 'Bilik Mawar (102)', capacity: 4 },
      { name: 'Bilik Anggerik (103)', capacity: 4 },
      { name: 'Bilik Dahlia (104)', capacity: 4 },
      { name: 'Bilik Cempaka (105)', capacity: 4 },
      { name: 'Bilik Teratai (106)', capacity: 4 },
      { name: 'Bilik Tanjung (107)', capacity: 4 },
    ];

    for (const r of rooms) {
      const existing = await prisma.room.findFirst({ where: { name: r.name } });
      if (!existing) {
        await prisma.room.create({ data: r });
      }
    }

    // Default Teams
    const teams = [
      { name: 'Team Merah', color: '#ef4444', capacity: 7 },
      { name: 'Team Biru', color: '#3b82f6', capacity: 7 },
      { name: 'Team Hijau', color: '#10b981', capacity: 7 },
      { name: 'Team Kuning', color: '#eab308', capacity: 7 },
    ];

    for (const t of teams) {
      const existing = await prisma.team.findFirst({ where: { name: t.name } });
      if (!existing) {
        await prisma.team.create({ data: t });
      }
    }

    // 28 Participants (M: 7, L: 6, XL: 5, XXL: 6, XXXL: 4)
    const initialParticipants = [
      // L (6)
      { name: 'AIEMANARIF BIN NORAZLAN', ic: '021020-01-1763', icNormalized: '021020011763', size: 'L', remarks: '' },
      { name: 'IZZAT AFIFI', ic: '', icNormalized: null, size: 'L', remarks: 'Peserta luar / Jemputan' },
      { name: 'MUHAMMAD AMIR AIMAN BIN MD HANAPI', ic: '021030-10-1519', icNormalized: '021030101519', size: 'L', remarks: '' },
      { name: 'NUR SYAFIQAH BINTI ZAINAL', ic: '970315-14-5544', icNormalized: '970315145544', size: 'L', remarks: '' },
      { name: 'FARAH WAHIDA BINTI ROSLI', ic: '981123-01-6678', icNormalized: '981123016678', size: 'L', remarks: '' },
      { name: 'AHMAD FAIZAL BIN HASHIM', ic: '930819-08-5431', icNormalized: '930819085431', size: 'L', remarks: '' },

      // XXXL (4)
      { name: 'ALIF NAJMI BIN ROSELAM', ic: '020925-06-0055', icNormalized: '020925060055', size: 'XXXL', remarks: '' },
      { name: 'CHAI CHUN YEEN', ic: '790101-08-5525', icNormalized: '790101085525', size: 'XXXL', remarks: '' },
      { name: 'MOHD SHUKRI BIN ABDULLAH', ic: '880612-10-5599', icNormalized: '880612105599', size: 'XXXL', remarks: '' },
      { name: 'KAMARUL ARIFFIN BIN OSMAN', ic: '850304-14-5001', icNormalized: '850304145001', size: 'XXXL', remarks: '' },

      // XXL (6)
      { name: 'AMY QUOH KOK HUI', ic: '840709-10-5021', icNormalized: '840709105021', size: 'XXL', remarks: '' },
      { name: 'EZAT SAZRUL BIN AZAM', ic: '900712-14-5585', icNormalized: '900712145585', size: 'XXL', remarks: '' },
      { name: 'HAFIZUL HAKIMIE BIN MOHD FAIZ', ic: '020620-08-1007', icNormalized: '020620081007', size: 'XXL', remarks: '' },
      { name: 'MUHAMMAD AL HAFIZ BIN ABDUL HALIL', ic: '040214-10-0231', icNormalized: '040214100231', size: 'XXL', remarks: '' },
      { name: 'ZULKIFLI BIN ISMAIL', ic: '810520-03-5123', icNormalized: '810520035123', size: 'XXL', remarks: '' },
      { name: 'SYED AMIR BIN SYED OTHMAN', ic: '910214-14-6101', icNormalized: '910214146101', size: 'XXL', remarks: '' },

      // M (7)
      { name: 'MOHD NASREEN BIN MHD NASIR', ic: '870113-43-5107', icNormalized: '870113435107', size: 'M', remarks: '' },
      { name: 'MUHAMMAD DANISH BIN YAZID', ic: '950516-14-5585', icNormalized: '950516145585', size: 'M', remarks: '' },
      { name: 'SITI SARAH BINTI AHMAD', ic: '960412-10-5890', icNormalized: '960412105890', size: 'M', remarks: '' },
      { name: 'NOR ATIKAH BINTI RAZALI', ic: '990710-08-5432', icNormalized: '990710085432', size: 'M', remarks: '' },
      { name: 'KHAIRUL ANWAR BIN MAT', ic: '921105-02-5567', icNormalized: '921105025567', size: 'M', remarks: '' },
      { name: 'TAN WEI LUN', ic: '940822-10-5111', icNormalized: '940822105111', size: 'M', remarks: '' },
      { name: 'WAN NURUL HUDA', ic: '980130-03-6002', icNormalized: '980130036002', size: 'M', remarks: '' },

      // XL (5)
      { name: 'MUHAMMAD ASYRAF BIN ISMAIL', ic: '020407-14-0493', icNormalized: '020407140493', size: 'XL', remarks: '' },
      { name: 'LOGANATHAN A/L MUNIANDY', ic: '891010-08-5887', icNormalized: '891010085887', size: 'XL', remarks: '' },
      { name: 'HARITH ISKANDAR BIN JAAFAR', ic: '950909-14-6019', icNormalized: '950909146019', size: 'XL', remarks: '' },
      { name: 'FAZRUL NIZAM BIN MOHAMAD', ic: '930401-01-5233', icNormalized: '930401015233', size: 'XL', remarks: '' },
      { name: 'CHONG MEI LING', ic: '911204-10-5044', icNormalized: '911204105044', size: 'XL', remarks: '' },
    ];

    const count = await prisma.participant.count();
    if (count === 0) {
      for (const p of initialParticipants) {
        await prisma.participant.create({
          data: p,
        });
      }
      console.log(`Berjaya masukkan ${initialParticipants.length} orang peserta contoh.`);
    } else {
      console.log(`Pangkalan data sudah mengandungi ${count} peserta, tiada peserta baru ditambah.`);
    }
  } else {
    console.log('SEED_DEMO bukan true. Data contoh (bilik/team/peserta) tidak dimasukkan.');
  }

  console.log('Selesai pembenihan data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
