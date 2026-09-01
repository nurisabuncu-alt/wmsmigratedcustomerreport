import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  type ChartSeries,
  Divider,
  Grid,
  H1,
  H2,
  LineChart,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useMemo,
} from "cursor/canvas";

// ---------------------------------------------------------------------------
// Shared time axis. 27 months, Jun 2024 - Aug 2026 (August 2026 complete).
// ---------------------------------------------------------------------------

const MONTHS = [
  "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12",
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07",
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
  "2026-08",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Data Studio renders the OrderMonth dimension as "Jun 1, 2024".
const MONTH_LABELS = MONTHS.map((m) => {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} 1, ${year}`;
});

// All accounts - every listed non-test company across the seven databases.
const ALL_CREATED = [
  1502358, 1509354, 1483515, 1166079, 1347734, 2007863, 2656725,
  1766272, 1539968, 1543920, 741577, 822901, 658126, 683739,
  508273, 472416, 529756, 709652, 685841,
  614825, 617203, 671656, 592644, 647509, 566220, 564435,
  558807,
];

const ALL_SHIPPED = [
  1480928, 1506592, 1417629, 1163478, 1314724, 1811307, 2754058,
  1748430, 1482926, 1449017, 736181, 725067, 659418, 585726,
  384759, 440712, 392390, 451799, 657244,
  395750, 420389, 465714, 384866, 462288, 437228, 365696,
  350522,
];

const ALL_CLIENTS = [
  483, 504, 528, 552, 580, 606, 614, 616, 645, 657, 653, 657, 643, 655,
  671, 680, 695, 666, 697, 683, 688, 706, 690, 688, 673, 633, 557,
];

type CompanyMonthly = {
  company: string;
  created: number[];
  shipped: number[];
  clients: number[];
};

// DeliverrLiveDB cohort - the companies visible in the PDF's Company filter.
const DELIVERR_COMPANIES: CompanyMonthly[] = [
  { company: "Flexport HUB (LAX1)", created: [266999,240739,247616,225951,242255,457780,615488,395416,536614,710383,28595,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [257799,241281,245001,219478,239916,428152,633253,387528,519955,693162,42219,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "Flexport HUB (EWR1)", created: [334590,332425,334671,263893,284622,490057,891488,440574,67501,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [330581,331439,332027,258694,285171,456767,902157,433562,71237,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "Flexport - DFW1", created: [0,13018,56754,79581,103293,196884,240487,184682,203002,207013,194106,229280,224163,183874,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [0,12271,55660,75712,95383,181473,241623,181661,198153,204044,188384,217248,214724,182399,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "CJ Logistics", created: [132242,147477,151255,115350,138824,195944,242212,238534,233150,61939,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [129667,145960,149981,113907,136433,184200,241476,235882,227844,67718,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "SFL_ATL_001", created: [238480,292823,163718,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [232230,294121,166517,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "GXO Logistics", created: [109611,55444,26198,5963,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [108466,55734,26103,5360,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "Flexport - LAX1RS", created: [0,275,1028,1454,1966,1855,1982,2907,3628,4004,3555,3233,3507,4152,4024,3865,3549,2551,3127,2761,2393,2582,2576,3308,3155,3251,2706], shipped: [0,122,1051,1207,1994,1854,1993,2400,3284,4064,3615,3087,3367,4059,3963,3711,3736,2245,3237,2614,2313,2547,2544,2653,3246,3119,2729], clients: [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { company: "EWR1RS", created: [502,640,518,577,529,450,496,615,492,510,573,480,529,537,418,525,559,592,611,651,707,932,1554,1616,2099,1822,875], shipped: [526,617,554,478,609,415,507,591,485,478,542,479,498,530,408,463,576,590,625,645,696,879,1466,1635,1706,2117,810], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { company: "GTH America", created: [12357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [12317,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "Flexport - DFW1RS", created: [0,0,0,4,8,0,1,2,136,258,215,198,90,129,165,344,267,495,467,657,619,1023,1262,1323,1913,2197,2525], shipped: [0,0,0,4,8,0,0,2,134,236,207,130,145,122,147,269,314,372,463,484,680,891,1235,1355,1791,2074,2189], clients: [0,0,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { company: "Custom Goods", created: [594,1092,838,1087,692,509,276,589,146,225,182,42,29,5,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [582,959,865,941,959,396,350,425,364,142,313,40,30,7,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "STO_PXR_LAX", created: [689,629,676,497,367,209,101,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,5,54,258,101], shipped: [655,560,715,465,420,211,106,23,1,0,0,0,0,0,0,0,0,0,0,0,0,0,7,24,34,133,221], clients: [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1] },
  { company: "STO_IRM_PER", created: [1128,920,274,164,77,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [1016,1059,300,167,89,5,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "Flexport - AMS1RS", created: [13,0,4,151,16,8,8,13,10,5,5,6,8,7,14,14,13,16,10,12,6,7,6,4,8,4,5], shipped: [13,0,4,4,13,6,7,13,6,5,5,4,6,8,7,11,10,15,10,11,6,5,4,6,7,3,4], clients: [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { company: "Cold_Solutions-Deliverr", created: [72,41,27,29,22,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [57,48,30,28,14,6,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "DFW33P", created: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,121], shipped: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60], clients: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1] },
  { company: "GPA FONTANA", created: [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { company: "Thunder", created: [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
];

type CompanyRow = CompanyMonthly & { db: string };

// The remaining migrated companies, on the other six databases.
const OTHER_COMPANIES: CompanyRow[] = [
  { db: "PEPSILIVE", company: "Pepsi", created: [55212,68185,63127,61384,73664,96127,97673,99648,86389,96291,82216,104293,94310,128010,124805,125956,119988,140151,118667,123905,128867,135746,112706,124893,127077,108494,124354], shipped: [51676,71315,60951,61384,73167,78224,113691,102406,84244,94521,85043,101009,95564,128707,115511,133973,120152,104889,153386,119565,127849,138752,113143,115750,137501,107914,118750], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "PROD3PL", company: "Right Fit Logistics", created: [158887,152409,170846,159328,159121,201033,180854,149898,116258,144815,132919,120569,56421,64404,50238,53660,51060,118212,96830,82735,77220,102214,97408,93386,77377,98973,87724], shipped: [136492,150164,152101,176186,149661,169971,179614,167352,106685,132967,127739,106177,74847,32506,35449,75532,42754,70434,100105,48414,39948,52466,47130,52192,53634,43994,53267], clients: [33,35,34,32,35,33,39,38,41,40,42,40,40,36,45,49,57,56,61,62,58,61,67,70,71,74,73] },
  { db: "PRODECOMMERCE", company: "Aviator Nation", created: [27498,27068,64967,26950,31240,76432,64886,26142,26182,36484,24946,84121,19707,29348,55250,41614,41551,84366,67307,22766,29539,34147,22937,81874,21606,15315,18044], shipped: [51524,27350,41006,55502,28353,40782,102407,21396,31386,34561,25398,64145,37008,32523,43490,52977,25874,55307,110110,20937,31048,33756,20613,81400,24143,15351,16575], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "LOGIWATECH", company: "Valencia Fulfillment", created: [5613,6818,20834,31774,25464,26400,52449,21366,30986,29057,24871,40558,23916,43831,35212,26668,35432,35434,35888,42400,45282,50192,61813,45134,52400,42525,43379], shipped: [4876,6432,18929,28928,18238,19518,58703,21125,30341,27893,23241,37821,24187,42225,31853,28198,31343,33687,34866,34501,41116,60168,55040,46111,52161,40611,39629], clients: [50,48,50,49,47,47,51,46,46,48,45,49,45,46,45,49,46,48,50,45,47,49,52,49,48,41,41] },
  { db: "HUBLIVE", company: "On Air Direct", created: [20800,35086,18831,22190,25073,47149,40812,30603,34563,37381,45118,34017,30751,30744,31118,27783,35231,46596,39782,33585,27911,36369,30298,34711,26373,24315,22568], shipped: [18936,32593,20601,21099,25310,43219,42604,30374,29722,38886,45875,32781,30351,30523,27044,28831,34421,45392,40224,32321,27351,35602,30600,32589,27750,23300,21679], clients: [37,36,36,38,36,35,38,37,39,41,38,39,36,37,37,31,30,30,39,35,40,39,33,35,32,33,30] },
  { db: "LOGIWATECH", company: "Simple Global", created: [53726,44926,51566,75973,55568,55931,46238,55066,55132,49882,56491,54439,40138,19597,10731,8401,8422,11803,18337,10410,8244,9026,7898,7991,8044,7832,7629], shipped: [65192,48411,50420,49846,76794,55066,48523,41682,67407,29962,74281,53817,39638,16473,12806,8987,8424,9943,18308,9673,7638,8629,7606,7607,7927,6767,7677], clients: [13,13,16,16,16,17,15,18,22,26,26,29,31,32,36,35,37,35,36,40,42,44,43,38,37,34,31] },
  { db: "HUBSYSTEMLIVE", company: "ONELIVE", created: [15804,19158,36890,19311,121360,44732,30847,15941,35172,33746,20847,19703,21733,33671,27571,23253,53780,35196,26826,27134,37570,31938,25260,27875,31566,35019,53842], shipped: [15648,16615,24751,21652,102105,49206,32826,23031,20854,20620,23475,17725,45454,30765,18125,22811,35107,25300,39419,17586,27277,29832,26011,32515,24080,22859,15509], clients: [48,54,66,67,79,93,102,99,106,114,131,130,134,141,147,159,162,165,181,166,175,186,174,184,171,163,122] },
  { db: "HUBSYSTEMLIVE", company: "Custom BackOffice Solutions", created: [2921,3738,5272,5025,6654,14206,16218,11790,12131,12618,10597,9846,14521,15694,24771,16462,17945,42999,51983,41254,48227,30512,33676,30737,34354,48732,33876], shipped: [2759,3822,5136,5273,6503,13204,16427,11877,11862,12562,10523,9762,14475,15014,24149,17282,17755,38690,54623,35854,51772,29370,32004,30009,37968,48030,32967], clients: [10,17,20,23,45,48,46,45,44,44,39,38,38,38,43,41,43,40,44,44,40,43,45,38,35,35,29] },
  { db: "HUBSYSTEMLIVE", company: "Simpson Fulfillment", created: [2158,5846,6803,4473,7666,6247,7279,5466,5190,5562,6404,8691,10086,10792,14250,13425,16070,14938,17467,23772,21602,28920,9188,21662,19123,12874,5826], shipped: [2089,4726,7898,4527,7603,5655,7382,5635,5235,5286,6420,8512,9619,10678,13403,11804,17556,10396,21974,23055,21401,28718,8169,21003,19492,1981,205], clients: [3,5,8,10,10,9,9,8,12,11,13,12,16,19,18,20,20,21,19,23,20,21,23,20,19,16,13] },
  { db: "LOGIWATECH", company: "Accurate Freight Systems", created: [9201,6332,5200,10230,9495,13044,18769,21685,37694,50191,49145,51889,63423,69410,76606,81618,94903,110802,133313,147222,145027,162146,147418,133690,116704,115473,114298], shipped: [8453,5943,4605,9521,8970,11367,18988,20777,19795,21112,19435,14622,16356,11703,9552,8016,8350,6390,5835,3447,2991,3116,3707,3038,2803,3886,3754], clients: [20,20,24,22,22,24,27,24,24,24,23,23,21,21,21,22,21,19,19,21,21,22,20,21,21,20,21] },
  { db: "HUBSYSTEMLIVE", company: "GoodBuy Gear", created: [6813,7018,7281,6310,7035,8577,8627,11887,9030,8711,8307,9274,7552,7150,6835,6676,7496,8003,5768,7228,7438,8998,9069,9857,8767,9653,9783], shipped: [6329,7216,6763,5959,7404,7536,7797,8685,8525,8734,7828,8397,7572,7277,6378,6666,7637,6777,7041,6960,7408,8694,9214,8853,9482,9858,9321], clients: [1,1,2,2,2,2,3,2,3,2,2,2,2,2,2,4,4,3,3,3,3,3,3,3,3,3,2] },
  { db: "HUBSYSTEMLIVE", company: "Inland Star", created: [8857,4651,7420,8606,8590,10275,9738,7468,6524,7100,5945,5324,5394,5932,6479,5594,5453,6227,6606,5226,3511,3195,2311,2629,2453,2419,2310], shipped: [8529,4934,7232,8400,8766,9421,10425,7378,6399,6780,5872,5153,5318,5853,6066,5809,5527,5450,7078,5009,3425,3214,2287,2348,2632,2345,2288], clients: [1,2,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,3,2,2,2,2,1,1,1,1,1] },
  { db: "LOGIWATECH", company: "Harris Tea Company", created: [4989,4747,4517,4602,4744,4930,4473,5559,4761,4731,4445,4552,4422,4614,4241,4232,5094,7102,7077,8415,7254,6052,4966,3998,4722,3939,3286], shipped: [4612,5050,4424,4628,4702,3825,5349,5520,4727,4625,4470,4378,4519,4607,3956,4391,5107,5409,8030,8417,6895,6804,4952,3711,4970,3927,3284], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "LOGIWATECH", company: "MV Sport", created: [4769,2793,2434,3953,7099,18322,32023,4513,3759,4353,4507,4814,4836,2639,3152,5680,6590,9115,9869,1006,152,11,69,0,3,11,3], shipped: [4198,2706,2202,3985,4920,15596,33083,4527,3709,4134,4421,3925,4373,2557,2533,5967,6179,7448,11653,1052,152,11,17,0,0,7,0], clients: [8,9,9,9,10,9,9,10,11,12,11,11,11,11,11,6,6,3,3,3,3,3,2,0,1,2,1] },
  { db: "LOGIWATECH", company: "3PL Pros", created: [8291,11460,10395,7906,5233,6544,6847,6681,4953,6743,7072,8244,7995,8225,10392,6646,5138,6848,8246,6254,5381,5716,2793,3289,4235,4179,3082], shipped: [7467,11894,9782,7898,5081,5792,6816,6531,4889,6339,6874,7469,7580,7591,9229,5165,901,868,2002,919,687,754,754,940,2002,1290,26], clients: [19,22,23,27,23,23,26,24,25,24,27,30,26,28,28,26,20,13,13,11,12,11,9,10,9,8,9] },
  { db: "PROD3PL", company: "WP Fulfillment", created: [2292,2549,2418,2612,4563,7825,14953,4598,4451,5125,5837,5177,2819,1609,2254,1982,2660,4804,9954,3866,2214,1946,1506,1810,2525,1814,2295], shipped: [2132,2470,2318,2463,4605,6735,15661,3390,4206,4577,6318,5100,2604,1632,1711,2085,1983,4228,10207,3164,2109,1569,1340,2070,2213,1890,2081], clients: [36,34,32,32,32,32,30,35,38,34,35,38,35,35,32,34,36,38,37,34,31,32,30,29,34,33,32] },
  { db: "LOGIWATECH", company: "Airyze", created: [5501,6472,6281,5306,4336,5904,8560,3707,3765,6437,6456,6414,4004,1711,1692,1764,1500,3331,7533,3271,393,396,388,429,345,412,491], shipped: [4951,6372,6015,5050,4262,4442,9683,3746,3639,6203,6373,6212,3749,1890,1575,1847,1827,2349,7721,3957,407,398,367,424,360,415,488], clients: [8,8,7,8,8,7,6,5,5,6,5,5,5,4,4,4,4,4,4,4,3,2,2,2,2,2,2] },
  { db: "HUBSYSTEMLIVE", company: "Group Transport Inc", created: [664,1903,1729,1941,1469,1408,2588,3710,1947,1369,893,623,2107,1197,3220,1187,1566,1095,1468,1103,1228,2398,2333,2149,5659,8398,4310], shipped: [742,1803,1693,1928,1474,1420,2370,3753,2100,1388,876,598,1964,961,2720,1330,1509,1015,1471,1183,1014,2470,1962,2191,5382,7837,3850], clients: [9,11,16,17,21,20,19,27,29,30,34,30,28,34,32,30,33,32,29,27,31,30,29,29,31,32,29] },
  { db: "LOGIWATECH", company: "California Olive Ranch", created: [1535,1711,1868,1964,1800,2992,2654,2105,1878,1979,2102,2080,1932,1921,1901,2049,2314,3201,3108,2462,2040,2264,2006,2168,2062,2053,1671], shipped: [1446,1561,1817,1971,1875,2058,3390,2150,1812,1947,2097,1994,1982,1856,1647,2077,2430,2350,3844,2381,2056,2219,2039,2015,2050,2136,1604], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "PROD3PL", company: "Genesis Engineering Services", created: [1289,1701,1731,1928,1945,2098,2482,1890,1621,2025,1711,1946,1676,1701,1927,1681,1981,2198,2916,2256,2684,2063,2068,1723,1859,2018,2013], shipped: [1151,1639,1607,1681,1869,1617,2353,1934,1285,1741,1928,1651,1722,1671,1763,1491,1765,1616,2981,2312,2492,2076,2035,1545,1642,2200,1572], clients: [12,12,12,13,12,12,12,14,13,15,14,15,15,15,14,14,14,15,14,15,14,14,10,13,14,13,13] },
  { db: "HUBSYSTEMLIVE", company: "Konami Gaming", created: [0,0,0,0,0,2155,2426,2586,2478,2765,1782,2144,1801,1695,2042,2002,1560,1699,2594,3227,2938,2573,1979,2224,2307,2278,2047], shipped: [0,0,0,0,0,1485,2486,2570,2399,2758,1708,2120,1705,1614,1908,1935,1532,1527,2508,2981,2959,2719,1779,2112,2276,2269,1916], clients: [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "LOGIWATECH", company: "Evolution Logistics", created: [1666,1741,1993,1736,1800,1310,1740,1175,1201,1071,1174,1320,1549,1425,1601,1838,1869,2109,2094,1639,1401,1750,1718,2051,2767,4373,4583], shipped: [1465,1756,1725,1595,1547,1668,1519,1235,1182,1098,1075,1271,1463,1309,1426,1729,1779,1968,2125,1594,1268,1765,1601,1588,3072,4151,2885], clients: [2,3,3,3,3,3,4,4,4,4,4,4,4,4,3,3,3,3,3,3,2,2,2,2,2,2,2] },
  { db: "PROD3PL", company: "7DayExpressOnline", created: [1390,1461,1394,1284,1387,1498,1726,1112,1157,1408,1785,1657,1670,1661,1419,1500,1423,1419,1813,1332,1460,2017,2114,2072,2369,2403,2334], shipped: [1541,1765,965,1245,1546,1665,1415,1210,1286,1290,1718,1536,1667,1599,1340,1515,1892,1533,1522,1405,1610,1759,2080,1756,2792,1980,2229], clients: [26,27,29,30,27,29,27,29,30,28,29,28,31,27,33,30,32,26,27,22,26,31,30,33,36,34,29] },
  { db: "PROD3PL", company: "UNITED WAREHOUSE", created: [300,393,495,745,1528,2841,2172,1636,2341,2957,2588,1857,1549,1295,1085,912,812,3357,890,2910,335,373,252,280,356,253,202], shipped: [269,379,408,687,1520,2560,2263,1614,2219,2749,2318,2227,1557,1229,1046,970,717,681,592,355,349,335,277,292,290,273,235], clients: [14,14,10,10,13,11,11,12,12,11,11,12,11,12,10,11,11,10,10,12,10,12,10,10,11,11,11] },
  { db: "LOGIWATECH", company: "National Commercial Warehouse", created: [614,862,799,711,831,557,636,752,582,765,802,806,764,788,917,779,950,873,929,835,853,878,944,898,908,1050,914], shipped: [566,812,786,683,804,525,619,737,582,743,802,779,783,783,870,780,920,802,937,810,844,884,917,890,896,1019,928], clients: [10,12,15,13,13,11,11,11,11,13,12,12,14,12,11,13,14,13,14,13,12,10,14,11,10,12,12] },
  { db: "LOGIWATECH", company: "Howlett", created: [936,513,449,662,551,826,865,768,625,811,692,1040,813,1614,270,334,531,621,888,548,420,531,157,122,138,357,31], shipped: [816,591,434,674,475,667,983,792,593,767,705,1017,824,950,951,343,522,471,948,569,396,569,160,124,117,359,22], clients: [5,5,5,5,5,5,5,5,5,5,5,4,5,5,5,4,4,4,4,4,5,2,2,1,1,1,1] },
  { db: "LOGIWATECH", company: "Velocity International Group", created: [6,5,169,600,847,434,470,487,558,607,549,606,743,1079,660,827,982,709,691,676,797,653,711,223,25,25,10], shipped: [0,5,139,523,578,572,450,497,554,420,623,613,688,940,851,674,878,873,704,649,756,668,763,254,31,25,0], clients: [1,1,2,2,3,4,3,3,3,5,5,5,5,5,5,7,7,7,7,7,6,6,5,4,2,2,1] },
  { db: "LOGIWATECH", company: "Golden Bridge", created: [491,521,553,520,552,526,589,524,503,551,474,493,433,420,471,504,503,399,439,451,446,422,400,506,653,643,561], shipped: [524,550,553,488,571,509,582,511,494,567,403,575,431,416,463,501,472,438,441,333,513,480,294,521,528,512,879], clients: [29,30,25,30,29,31,23,22,26,25,21,22,22,24,23,25,28,21,22,23,23,24,20,21,23,26,19] },
  { db: "LOGIWATECH", company: "JKD", created: [632,767,714,645,663,704,674,627,484,583,771,710,550,555,506,404,445,380,329,341,374,695,480,383,66,49,0], shipped: [599,783,699,639,656,609,723,611,485,572,729,697,544,538,493,420,443,355,317,350,372,689,476,357,66,49,0], clients: [5,5,3,5,3,4,5,6,7,6,6,7,6,5,6,6,5,5,4,6,5,6,7,7,3,2,0] },
  { db: "LOGIWATECH", company: "BTX Fulfillment", created: [351,927,779,956,2879,1283,2016,1578,1125,1195,894,375,177,216,30,31,15,17,15,7,3,2,2,23,19,14,11], shipped: [324,781,878,853,2572,1066,1754,1366,1135,1174,424,87,152,185,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [15,17,17,22,21,29,25,26,25,24,13,4,3,2,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "HUBSYSTEMLIVE", company: "GTH-America", created: [312,461,532,392,477,565,498,338,270,363,280,291,295,315,434,480,483,530,515,545,578,591,500,509,553,68,50], shipped: [297,456,519,386,465,534,466,340,274,359,276,286,293,304,362,541,455,514,524,527,583,533,533,474,609,66,54], clients: [14,17,17,17,19,19,18,17,17,17,18,16,15,15,14,14,15,15,14,15,15,14,11,13,12,3,2] },
  { db: "LOGIWATECH", company: "FavaFill Inc", created: [291,245,190,234,274,222,217,293,236,218,340,345,326,382,317,366,342,387,213,527,640,717,515,636,123,0,0], shipped: [291,240,195,234,269,223,217,293,236,218,332,336,336,376,322,361,348,386,211,525,641,712,515,629,136,0,0], clients: [2,3,2,3,2,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0] },
  { db: "HUBSYSTEMLIVE", company: "A to Z Drying", created: [272,255,280,273,279,234,296,309,389,622,452,398,332,329,318,266,245,184,323,286,381,592,453,344,426,0,0], shipped: [270,257,266,285,275,232,284,320,384,620,459,384,323,337,311,282,242,181,275,328,352,598,430,392,425,5,0], clients: [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0] },
  { db: "HUBSYSTEMLIVE", company: "Komyo", created: [281,315,330,284,321,288,271,312,292,303,307,322,286,381,363,380,398,288,289,341,354,304,231,207,231,216,265], shipped: [272,319,333,281,318,285,263,314,287,309,305,320,292,364,363,381,397,298,290,331,352,317,232,198,236,217,263], clients: [1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1] },
  { db: "PROD3PL", company: "YM Trading", created: [282,247,331,200,189,228,276,273,248,300,247,313,258,284,220,252,214,267,246,316,220,267,215,244,285,239,159], shipped: [203,260,226,186,172,275,147,300,198,251,202,241,267,257,236,176,175,305,255,186,228,271,175,221,267,239,129], clients: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { db: "LOGIWATECH", company: "Admirari3Pl", created: [239,239,218,181,191,158,151,143,144,169,170,195,241,169,180,190,192,161,181,232,256,281,260,268,277,340,319], shipped: [238,232,221,183,192,158,150,144,143,170,170,194,241,170,179,188,192,162,180,192,256,277,263,263,278,338,316], clients: [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,4,3,4,5,4,5,5,5,4,4] },
  { db: "PROD3PL", company: "Amir Transports", created: [134,103,143,139,95,117,153,213,191,195,132,124,194,152,142,235,192,133,197,224,211,195,143,251,234,147,204], shipped: [125,92,66,200,71,135,166,187,176,193,123,123,159,139,153,223,189,145,202,154,179,198,125,233,233,150,127], clients: [21,14,15,16,13,16,17,15,15,18,15,22,16,16,20,16,16,12,13,17,16,12,18,17,18,13,13] },
  { db: "HUBSYSTEMLIVE", company: "Knight Swift Warehouse and Fulfillment", created: [20,158,126,22,22,0,6,37,62,68,37,25,53,49,0,0,0,0,0,0,0,0,0,0,0,0,0], shipped: [11,126,157,9,22,0,3,33,14,72,37,25,41,79,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [2,2,1,1,1,0,2,2,2,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { db: "PROD3PL", company: "Home Accent Pillows", created: [37,47,33,28,58,37,33,48,17,32,41,67,23,26,32,37,38,44,35,37,27,22,24,7,0,0,0], shipped: [0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], clients: [2,2,1,1,2,2,1,4,3,3,3,4,3,4,3,3,3,2,3,3,2,2,3,2,0,0,0] },
];

// Grain: on DeliverrLiveDB the migrated IDs are clients of a single company,
// Flexport. On the other six databases each ID is a company of its own, and
// client-level detail is not broken out.
type EntityRow = {
  db: string;
  company: string;
  client: string;
  created: number[];
  shipped: number[];
  clients: number[];
};

const shippedTotal = (r: { shipped: number[] }) => r.shipped.reduce((s, v) => s + v, 0);

const ENTITIES: EntityRow[] = [
  ...DELIVERR_COMPANIES.map((r) => ({
    db: "DeliverrLiveDB",
    company: "Flexport",
    client: r.company,
    created: r.created,
    shipped: r.shipped,
    clients: r.clients,
  })),
  ...OTHER_COMPANIES.map((r) => ({ ...r, client: "" })),
].sort((a, b) => shippedTotal(b) - shippedTotal(a));

const DATABASES = [
  "DeliverrLiveDB",
  "LOGIWATECH",
  "PROD3PL",
  "PEPSILIVE",
  "HUBSYSTEMLIVE",
  "PRODECOMMERCE",
  "HUBLIVE",
];

function seriesSum(
  rows: { created: number[]; shipped: number[]; clients: number[] }[],
  key: "created" | "shipped" | "clients",
): number[] {
  const out = MONTHS.map(() => 0);
  for (const row of rows) {
    for (let i = 0; i < out.length; i += 1) out[i] += row[key][i];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dashboard-tab data (period totals per database and per company).
// ---------------------------------------------------------------------------

const DB_TOTALS = [
  { db: "DeliverrLiveDB", created: 12206615, shipped: 12008992 },
  { db: "LOGIWATECH", created: 4535724, shipped: 2683257 },
  { db: "PROD3PL", created: 3305610, shipped: 2810568 },
  { db: "PEPSILIVE", created: 2822138, shipped: 2809037 },
  { db: "HUBSYSTEMLIVE", created: 2327236, shipped: 2158084 },
  { db: "PRODECOMMERCE", created: 1102287, shipped: 1124922 },
  { db: "HUBLIVE", created: 869758, shipped: 849978 },
];

const COMPANIES: { db: string; company: string; created: number; shipped: number; fill: number }[] = [
  { db: "DeliverrLiveDB", company: "Flexport HUB (LAX1)", created: 3967836, shipped: 3907744, fill: 98.5 },
  { db: "DeliverrLiveDB", company: "Flexport HUB (EWR1)", created: 3439821, shipped: 3401635, fill: 98.9 },
  { db: "PEPSILIVE", company: "Pepsi", created: 2822138, shipped: 2809037, fill: 99.5 },
  { db: "PROD3PL", company: "Right Fit Logistics", created: 3054799, shipped: 2577781, fill: 84.4 },
  { db: "DeliverrLiveDB", company: "Flexport - DFW1", created: 2116137, shipped: 2048735, fill: 96.8 },
  { db: "DeliverrLiveDB", company: "CJ Logistics", created: 1656927, shipped: 1633068, fill: 98.6 },
  { db: "PRODECOMMERCE", company: "Aviator Nation", created: 1102287, shipped: 1124922, fill: 102.1 },
  { db: "LOGIWATECH", company: "Valencia Fulfillment", created: 935696, shipped: 891741, fill: 95.3 },
  { db: "HUBLIVE", company: "On Air Direct", created: 869758, shipped: 849978, fill: 97.7 },
  { db: "LOGIWATECH", company: "Simple Global", created: 839441, shipped: 839504, fill: 100.0 },
  { db: "HUBSYSTEMLIVE", company: "ONELIVE", created: 905745, shipped: 781158, fill: 86.2 },
  { db: "DeliverrLiveDB", company: "SFL_ATL_001", created: 695021, shipped: 692869, fill: 99.7 },
  { db: "HUBSYSTEMLIVE", company: "Custom BackOffice Solutions", created: 596759, shipped: 589672, fill: 98.8 },
  { db: "HUBSYSTEMLIVE", company: "Simpson Fulfillment", created: 311780, shipped: 290422, fill: 93.1 },
  { db: "LOGIWATECH", company: "Accurate Freight Systems", created: 1994928, shipped: 256532, fill: 12.9 },
  { db: "HUBSYSTEMLIVE", company: "GoodBuy Gear", created: 219143, shipped: 210311, fill: 96.0 },
  { db: "DeliverrLiveDB", company: "GXO Logistics", created: 197216, shipped: 195663, fill: 99.2 },
  { db: "HUBSYSTEMLIVE", company: "Inland Star", created: 156237, shipped: 153938, fill: 98.5 },
  { db: "LOGIWATECH", company: "Harris Tea Company", created: 136464, shipped: 135289, fill: 99.1 },
  { db: "LOGIWATECH", company: "MV Sport", created: 136475, shipped: 129355, fill: 94.8 },
  { db: "LOGIWATECH", company: "3PL Pros", created: 178788, shipped: 127540, fill: 71.3 },
  { db: "PROD3PL", company: "WP Fulfillment", created: 106458, shipped: 100861, fill: 94.7 },
  { db: "LOGIWATECH", company: "Airyze", created: 96799, shipped: 94722, fill: 97.9 },
  { db: "DeliverrLiveDB", company: "Flexport - LAX1RS", created: 73394, shipped: 70754, fill: 96.4 },
  { db: "HUBSYSTEMLIVE", company: "Group Transport Inc", created: 59662, shipped: 57004, fill: 95.5 },
  { db: "LOGIWATECH", company: "California Olive Ranch", created: 57820, shipped: 56804, fill: 98.2 },
  { db: "PROD3PL", company: "Genesis Engineering Services", created: 53131, shipped: 49339, fill: 92.9 },
  { db: "HUBSYSTEMLIVE", company: "Konami Gaming", created: 49302, shipped: 47266, fill: 95.9 },
  { db: "LOGIWATECH", company: "Evolution Logistics", created: 50694, shipped: 46859, fill: 92.4 },
  { db: "PROD3PL", company: "7DayExpressOnline", created: 44265, shipped: 43861, fill: 99.1 },
  { db: "PROD3PL", company: "UNITED WAREHOUSE", created: 34714, shipped: 28411, fill: 81.8 },
  { db: "LOGIWATECH", company: "National Commercial Warehouse", created: 21997, shipped: 21501, fill: 97.7 },
  { db: "DeliverrLiveDB", company: "EWR1RS", created: 20409, shipped: 19925, fill: 97.6 },
  { db: "LOGIWATECH", company: "Howlett", created: 16113, shipped: 15839, fill: 98.3 },
  { db: "LOGIWATECH", company: "Velocity International Group", created: 14149, shipped: 13728, fill: 97.0 },
  { db: "LOGIWATECH", company: "Golden Bridge", created: 13548, shipped: 13549, fill: 100.0 },
  { db: "LOGIWATECH", company: "JKD", created: 13531, shipped: 13271, fill: 98.1 },
  { db: "DeliverrLiveDB", company: "Flexport - DFW1RS", created: 14298, shipped: 13252, fill: 92.7 },
  { db: "LOGIWATECH", company: "BTX Fulfillment", created: 14940, shipped: 12751, fill: 85.3 },
  { db: "DeliverrLiveDB", company: "GTH America", created: 12357, shipped: 12317, fill: 99.7 },
  { db: "HUBSYSTEMLIVE", company: "GTH-America", created: 11225, shipped: 11030, fill: 98.3 },
  { db: "LOGIWATECH", company: "FavaFill Inc", created: 8596, shipped: 8582, fill: 99.8 },
  { db: "HUBSYSTEMLIVE", company: "A to Z Drying", created: 8538, shipped: 8517, fill: 99.8 },
  { db: "HUBSYSTEMLIVE", company: "Komyo", created: 8160, shipped: 8137, fill: 99.7 },
  { db: "DeliverrLiveDB", company: "Custom Goods", created: 6306, shipped: 6373, fill: 101.1 },
  { db: "PROD3PL", company: "YM Trading", created: 6820, shipped: 6048, fill: 88.7 },
  { db: "LOGIWATECH", company: "Admirari3Pl", created: 5745, shipped: 5690, fill: 99.0 },
  { db: "PROD3PL", company: "Amir Transports", created: 4593, shipped: 4266, fill: 92.9 },
  { db: "DeliverrLiveDB", company: "STO_PXR_LAX", created: 3629, shipped: 3575, fill: 98.5 },
  { db: "DeliverrLiveDB", company: "STO_IRM_PER", created: 2571, shipped: 2639, fill: 102.6 },
  { db: "HUBSYSTEMLIVE", company: "Knight Swift Warehouse and Fulfillment", created: 685, shipped: 629, fill: 91.8 },
  { db: "DeliverrLiveDB", company: "Flexport - AMS1RS", created: 373, shipped: 193, fill: 51.7 },
  { db: "DeliverrLiveDB", company: "Cold_Solutions-Deliverr", created: 192, shipped: 184, fill: 95.8 },
  { db: "DeliverrLiveDB", company: "DFW33P", created: 121, shipped: 60, fill: 49.6 },
  { db: "DeliverrLiveDB", company: "GPA FONTANA", created: 4, shipped: 6, fill: 150.0 },
  { db: "PROD3PL", company: "Home Accent Pillows", created: 830, shipped: 1, fill: 0.1 },
  { db: "DeliverrLiveDB", company: "Thunder", created: 3, shipped: 0, fill: 0 },
];

// COMPANIES is entity grain. These helpers restate DeliverrLiveDB rows as
// clients of Flexport and roll them into a single company row.
const entityCompany = (r: { db: string; company: string }) =>
  r.db === "DeliverrLiveDB" ? "Flexport" : r.company;

const entityClient = (r: { db: string; company: string }) =>
  r.db === "DeliverrLiveDB" ? r.company : "";

const COMPANY_TOTALS = (() => {
  const byKey = new Map<
    string,
    { db: string; company: string; created: number; shipped: number; fill: number }
  >();
  for (const row of COMPANIES) {
    const company = entityCompany(row);
    const key = `${row.db}|${company}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { db: row.db, company, created: row.created, shipped: row.shipped, fill: 0 });
      continue;
    }
    existing.created += row.created;
    existing.shipped += row.shipped;
  }
  return [...byKey.values()]
    .map((r) => ({ ...r, fill: r.created === 0 ? 0 : (100 * r.shipped) / r.created }))
    .sort((a, b) => b.shipped - a.shipped);
})();

// TTM = Sep 2025-Aug 2026 vs Sep 2024-Aug 2025. August 2026 is complete.
const TTM_PREV_SHIPPED = 14815091;
const TTM_CURR_SHIPPED = 5224598;
const OFFBOARDED_DELTA = -8780259;
const CONTINUING_PREV = 6034832;
const CONTINUING_CURR = 5224598;
const CONTINUING_COUNT = 42;

const CONT_CREATED = [
  405870, 424243, 501226, 473055, 574990, 665361, 664718,
  504814, 498351, 563065, 517722, 593112, 433681, 499569,
  508211, 472348, 529703, 709591, 685791,
  614781, 617173, 671632, 592618, 647479, 566201, 564421,
  558796,
];

const CONT_SHIPPED = [
  407872, 422812, 440110, 488328, 554165, 559242, 733438,
  507973, 464224, 482705, 504804, 507667, 444471, 403056,
  384759, 440712, 392390, 451799, 657244,
  395750, 420389, 465714, 384866, 462288, 437228, 365696,
  350522,
];

const OFFBOARDED: { db: string; company: string; lost: number; lastActive: string }[] = [
  { db: "DeliverrLiveDB", company: "Flexport HUB (LAX1)", lost: 3163663, lastActive: "2025-04" },
  { db: "DeliverrLiveDB", company: "Flexport HUB (EWR1)", lost: 2407588, lastActive: "2025-02" },
  { db: "DeliverrLiveDB", company: "Flexport - DFW1", lost: 1980804, lastActive: "2025-07" },
  { db: "DeliverrLiveDB", company: "CJ Logistics", lost: 1207460, lastActive: "2025-03" },
  { db: "DeliverrLiveDB", company: "GXO Logistics", lost: 5360, lastActive: "2024-09" },
  { db: "DeliverrLiveDB", company: "Custom Goods", lost: 3967, lastActive: "2025-07" },
  { db: "HUBSYSTEMLIVE", company: "Knight Swift Warehouse and Fulfillment", lost: 335, lastActive: "2025-07" },
  { db: "DeliverrLiveDB", company: "STO_IRM_PER", lost: 264, lastActive: "2024-12" },
  { db: "DeliverrLiveDB", company: "Cold_Solutions-Deliverr", lost: 49, lastActive: "2024-12" },
  { db: "DeliverrLiveDB", company: "SFL_ATL_001", lost: 1, lastActive: "2024-09" },
];

// Flexport at company grain: still active through a few reserve-storage clients,
// so it belongs with the shrinking companies rather than the offboarded list.
const FLEXPORT_TTM = (() => {
  const shipped = seriesSum(
    ENTITIES.filter((r) => r.company === "Flexport"),
    "shipped",
  );
  return { prev: sumRange(shipped, 3, 14), curr: sumRange(shipped, 15, 26) };
})();

const CONCENTRATION: { company: string; share: number }[] = [
  { company: "Pepsi", share: 28.6 },
  { company: "Right Fit Logistics", share: 13.0 },
  { company: "Valencia Fulfillment", share: 9.5 },
  { company: "Aviator Nation", share: 9.3 },
  { company: "Custom BackOffice Solutions", share: 8.2 },
  { company: "On Air Direct", share: 7.3 },
  { company: "ONELIVE", share: 6.1 },
  { company: "Simpson Fulfillment", share: 3.6 },
];

const FILL_OUTLIERS: { db: string; company: string; created: number; shipped: number; fill: number }[] = [
  { db: "LOGIWATECH", company: "Accurate Freight Systems", created: 1502614, shipped: 55333, fill: 3.7 },
  { db: "LOGIWATECH", company: "3PL Pros", created: 61807, shipped: 16308, fill: 26.4 },
  { db: "PROD3PL", company: "UNITED WAREHOUSE", created: 10932, shipped: 5366, fill: 49.1 },
  { db: "PROD3PL", company: "Right Fit Logistics", created: 1036799, shipped: 679870, fill: 65.6 },
  { db: "HUBSYSTEMLIVE", company: "ONELIVE", created: 409259, shipped: 318306, fill: 77.8 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function num(n: number): string {
  return n === 0 ? "-" : n.toLocaleString();
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return 0;
  return (100 * (curr - prev)) / prev;
}

function fmtPct(n: number): string {
  const rounded = n.toFixed(1);
  return n > 0 ? `+${rounded}%` : `${rounded}%`;
}

function sumRange(values: number[], from: number, to: number): number {
  let total = 0;
  for (let i = from; i <= to; i += 1) total += values[i];
  return total;
}

// A single selected month leaves one category, which a line chart draws as a
// lone dot, so fall back to bars whenever there is no trend to draw.
function TrendChart({
  categories,
  series,
  height,
  fill,
}: {
  categories: string[];
  series: ChartSeries[];
  height: number;
  fill?: boolean;
}) {
  if (categories.length < 2) {
    return <BarChart height={height} categories={categories} series={series} />;
  }
  return (
    <LineChart height={height} categories={categories} series={series} fill={fill} />
  );
}

function quarterOf(monthKey: string): { year: number; q: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, q: Math.ceil(month / 3) };
}

type Period = { value: string; label: string; from: number; to: number };

const ALL_TIME: Period = {
  value: "all",
  label: "All time (Jun 2024 - Aug 2026)",
  from: 0,
  to: MONTHS.length - 1,
};

const QUARTER_RANGES: Period[] = (() => {
  const ranges: Period[] = [];
  let i = 0;
  while (i < MONTHS.length) {
    const { year, q } = quarterOf(MONTHS[i]);
    let j = i;
    while (j + 1 < MONTHS.length) {
      const next = quarterOf(MONTHS[j + 1]);
      if (next.year !== year || next.q !== q) break;
      j += 1;
    }
    const names = MONTHS.slice(i, j + 1).map((m) => MONTH_NAMES[Number(m.slice(5)) - 1]);
    const span = names.length === 1 ? names[0] : `${names[0]} - ${names[names.length - 1]}`;
    const partial = j - i + 1 < 3;
    ranges.push({
      value: `q${q}-${year}`,
      label: partial ? `Q${q} ${year} (${span}, partial)` : `Q${q} ${year} (${span})`,
      from: i,
      to: j,
    });
    i = j + 1;
  }
  return ranges;
})();

const MONTH_RANGES: Period[] = MONTHS.map((m, i) => ({
  value: m,
  label: MONTH_LABELS[i],
  from: i,
  to: i,
}));

function resolvePeriod(quarter: string, month: string): Period {
  if (month !== "none") {
    return MONTH_RANGES.find((r) => r.value === month) ?? ALL_TIME;
  }
  if (quarter === "all" || quarter === "none") return ALL_TIME;
  return QUARTER_RANGES.find((r) => r.value === quarter) ?? ALL_TIME;
}

function PeriodFilters({
  quarter,
  month,
  onQuarter,
  onMonth,
}: {
  quarter: string;
  month: string;
  onQuarter: (value: string) => void;
  onMonth: (value: string) => void;
}) {
  return (
    <>
      <Row gap={8} align="center">
        <Text weight="semibold">Quarter</Text>
        <Select
          value={month !== "none" ? "none" : quarter}
          onChange={(value) => {
            if (value === "none") {
              onQuarter(month !== "none" ? "none" : "all");
              return;
            }
            onQuarter(value);
            onMonth("none");
          }}
          options={[
            { value: "none", label: "Not used" },
            { value: "all", label: ALL_TIME.label },
            ...QUARTER_RANGES.map((r) => ({ value: r.value, label: r.label })),
          ]}
        />
      </Row>
      <Row gap={8} align="center">
        <Text weight="semibold">Month</Text>
        <Select
          value={month}
          onChange={(value) => {
            onMonth(value);
            onQuarter(value === "none" ? "all" : "none");
          }}
          options={[
            { value: "none", label: "Not used" },
            ...MONTH_RANGES.map((r) => ({ value: r.value, label: r.label })),
          ]}
        />
      </Row>
    </>
  );
}

function periodTotals(
  rows: { db: string; company: string; created: number[]; shipped: number[]; clients: number[] }[],
  from: number,
  to: number,
): {
  db: string;
  company: string;
  created: number;
  shipped: number;
  fill: number;
  clientsPeak: number;
}[] {
  const byKey = new Map<
    string,
    { db: string; company: string; created: number; shipped: number; clientMonths: number[] }
  >();
  for (const row of rows) {
    const key = `${row.db}|${row.company}`;
    const created = sumRange(row.created, from, to);
    const shipped = sumRange(row.shipped, from, to);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        db: row.db,
        company: row.company,
        created,
        shipped,
        clientMonths: [...row.clients],
      });
    } else {
      existing.created += created;
      existing.shipped += shipped;
      for (let i = 0; i < existing.clientMonths.length; i += 1) {
        existing.clientMonths[i] += row.clients[i];
      }
    }
  }
  return [...byKey.values()]
    .map((r) => {
      let clientsPeak = 0;
      for (let i = from; i <= to; i += 1) {
        if (r.clientMonths[i] > clientsPeak) clientsPeak = r.clientMonths[i];
      }
      return {
        db: r.db,
        company: r.company,
        created: r.created,
        shipped: r.shipped,
        fill: r.created === 0 ? 0 : (100 * r.shipped) / r.created,
        clientsPeak,
      };
    })
    .filter((r) => r.created > 0 || r.shipped > 0)
    .sort((a, b) => b.shipped - a.shipped);
}

function alignedYoy(values: number[], from: number, to: number): number {
  let curr = 0;
  let prev = 0;
  for (let i = from; i <= to; i += 1) {
    if (i - 12 >= 0) {
      curr += values[i];
      prev += values[i - 12];
    }
  }
  return pctChange(curr, prev);
}

type Mover = { company: string; prev: number; curr: number; yoy: number; clients: number };

function companyShippedInRange(
  rows: { company: string; shipped: number[] }[],
  from: number,
  to: number,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.company, (map.get(row.company) ?? 0) + sumRange(row.shipped, from, to));
  }
  return map;
}

function companyPeakClients(
  rows: { company: string; clients: number[] }[],
  from: number,
  to: number,
): Map<string, number> {
  const months = new Map<string, number[]>();
  for (const row of rows) {
    const existing = months.get(row.company);
    if (!existing) {
      months.set(row.company, [...row.clients]);
    } else {
      for (let i = 0; i < existing.length; i += 1) existing[i] += row.clients[i];
    }
  }
  const peaks = new Map<string, number>();
  for (const [company, series] of months) {
    let peak = 0;
    for (let i = from; i <= to; i += 1) {
      if (series[i] > peak) peak = series[i];
    }
    peaks.set(company, peak);
  }
  return peaks;
}

function companyMovers(
  rows: { company: string; shipped: number[]; clients: number[] }[],
  currFrom: number,
  currTo: number,
): { decliners: Mover[]; growers: Mover[] } {
  const prevFrom = currFrom - 12;
  const prevTo = currTo - 12;
  if (prevFrom < 0) return { decliners: [], growers: [] };

  const curr = companyShippedInRange(rows, currFrom, currTo);
  const prev = companyShippedInRange(rows, prevFrom, prevTo);
  const clients = companyPeakClients(rows, currFrom, currTo);
  const names = new Set([...curr.keys(), ...prev.keys()]);
  const movers: Mover[] = [];
  for (const company of names) {
    const c = curr.get(company) ?? 0;
    const p = prev.get(company) ?? 0;
    if (c + p < 1_000) continue;
    movers.push({
      company,
      prev: p,
      curr: c,
      yoy: pctChange(c, p),
      clients: clients.get(company) ?? 0,
    });
  }

  const decliners = movers
    .filter((m) => m.curr > 0 && m.yoy < 0)
    .sort((a, b) => b.prev - b.curr - (a.prev - a.curr))
    .slice(0, 8);
  const growers = movers
    .filter((m) => m.curr > 0 && m.yoy > 0)
    .sort((a, b) => b.yoy - a.yoy)
    .slice(0, 8);
  return { decliners, growers };
}

// ---------------------------------------------------------------------------
// Tab 1 - Data Studio report replica
// ---------------------------------------------------------------------------

function DataStudioTab() {
  const [dbFilter, setDbFilter] = useCanvasState("ds-db", "all");
  const [company, setCompany] = useCanvasState("ds-company", "all");
  const [client, setClient] = useCanvasState("ds-client", "all");
  const [quarter, setQuarter] = useCanvasState("ds-quarter", "all");
  const [month, setMonth] = useCanvasState("ds-month", "none");

  const selectedRange = resolvePeriod(quarter, month);
  const { from, to } = selectedRange;
  const monthLabels = MONTH_LABELS.slice(from, to + 1);

  const inDatabase = useMemo(
    () => (dbFilter === "all" ? ENTITIES : ENTITIES.filter((r) => r.db === dbFilter)),
    [dbFilter],
  );

  // Company options follow the database selection, and Client options follow the
  // company, as the linked filters do in Looker Studio. A stale selection falls
  // back to the wider scope instead of emptying the report.
  const companyOptions = useMemo(
    () => [...new Set(inDatabase.map((r) => r.company))],
    [inDatabase],
  );

  const inCompany = useMemo(() => {
    const match = inDatabase.filter((r) => r.company === company);
    return company === "all" || match.length === 0 ? inDatabase : match;
  }, [inDatabase, company]);

  const clientOptions = useMemo(
    () => inCompany.filter((r) => r.client).map((r) => r.client),
    [inCompany],
  );

  const scopeRows = useMemo(() => {
    const match = inCompany.filter((r) => r.client === client);
    return client === "all" || match.length === 0 ? inCompany : match;
  }, [inCompany, client]);

  const scopeCreated = useMemo(() => seriesSum(scopeRows, "created"), [scopeRows]);
  const scopeShipped = useMemo(() => seriesSum(scopeRows, "shipped"), [scopeRows]);
  const scopeClients = useMemo(() => seriesSum(scopeRows, "clients"), [scopeRows]);

  const slice = (values: number[]) => values.slice(from, to + 1);
  const companyCount = new Set(scopeRows.map((r) => r.company)).size;
  const scopeLabel =
    scopeRows.length === 1
      ? (scopeRows[0].client || scopeRows[0].company)
      : companyCount === 1
        ? scopeRows[0].company
        : dbFilter === "all"
          ? "all migrated companies"
          : dbFilter;

  return (
    <Stack gap={24}>
      <Text tone="secondary">
        Rebuild of the Looker Studio (Data Studio) report from MSSQL: the
        Company / Client pivot of OrderShippedCount vs OrderCreatedCount by month,
        the migrated account chart, and the all accounts chart. Covers 40 migrated
        companies with volume across the three servers, including Flexport's 18
        clients on DeliverrLiveDB.
      </Text>

      <Row gap={16} align="center" wrap>
        <Row gap={8} align="center">
          <Text weight="semibold">Database</Text>
          <Select
            value={dbFilter}
            onChange={setDbFilter}
            options={[
              { value: "all", label: "All databases" },
              ...DATABASES.map((d) => ({ value: d, label: d })),
            ]}
          />
        </Row>
        <Row gap={8} align="center">
          <Text weight="semibold">Company</Text>
          <Select
            value={company}
            onChange={setCompany}
            options={[
              { value: "all", label: "All companies" },
              ...companyOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Row>
        <Row gap={8} align="center">
          <Text weight="semibold">Client</Text>
          <Select
            value={client}
            onChange={setClient}
            options={[
              { value: "all", label: "All clients" },
              ...clientOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Row>
        <PeriodFilters
          quarter={quarter}
          month={month}
          onQuarter={setQuarter}
          onMonth={setMonth}
        />
      </Row>

      <Grid columns={4} gap={16}>
        <Stat value={fmt(sumRange(scopeShipped, from, to))} label="OrderShippedCount (selection)" />
        <Stat value={fmt(sumRange(scopeCreated, from, to))} label="OrderCreatedCount (selection)" />
        <Stat
          value={String(Math.max(0, ...slice(scopeClients)))}
          label="Peak monthly clients (selection)"
        />
        <Stat value={String(scopeRows.length)} label="Rows (company / client)" />
      </Grid>

      <Stack gap={8}>
        <H2>OrderMonth / OrderShippedCount / OrderCreatedCount</H2>
        <Text tone="tertiary">
          Company x client x month pivot. Each cell shows shipped / created /
          clients, sorted by shipped volume. Scroll horizontally for later months.
          Source: MSSQL | {selectedRange.label} | {scopeLabel}
        </Text>
        <Table
          striped
          stickyHeader
          headers={["Database", "Company", "Client", "Total shipped / created / clients", ...monthLabels]}
          columnAlign={["left", "left", "left", "right", ...monthLabels.map(() => "right" as const)]}
          rows={scopeRows.map((r) => [
            r.db,
            r.company,
            r.client || "all clients",
            `${num(sumRange(r.shipped, from, to))} / ${num(sumRange(r.created, from, to))} / ${num(Math.max(0, ...slice(r.clients)))}`,
            ...slice(r.shipped).map(
              (v, i) => `${num(v)} / ${num(slice(r.created)[i])} / ${num(slice(r.clients)[i])}`,
            ),
          ])}
        />
      </Stack>

      <Stack gap={8}>
        <H2>Migrated Account Order Shipped VS Created Count per Company per Month</H2>
        <Text tone="tertiary">
          Source: MSSQL | {selectedRange.label} | {scopeLabel} | counts in orders.
          This chart follows the filters above.
        </Text>
        <BarChart
          height={300}
          categories={monthLabels}
          series={[
            { name: "OrderShippedCount", data: slice(scopeShipped), tone: "info" },
            { name: "OrderCreatedCount", data: slice(scopeCreated), tone: "success" },
          ]}
        />
        <TrendChart
          height={150}
          categories={monthLabels}
          series={[{ name: "Client", data: slice(scopeClients), tone: "warning" }]}
        />
        <Text tone="tertiary">
          Distinct Client count for the same selection. The original report puts
          this on a secondary axis of the same chart; the canvas chart library has
          no dual axis, so it is split into its own panel.
        </Text>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>All Accounts Order Shipped VS Created Count per Company per Month</H2>
        <Text tone="tertiary">
          Source: MSSQL, all seven databases | {selectedRange.label} | all 57
          companies with volume, ignoring the filters above | counts in orders
        </Text>
        <BarChart
          height={300}
          categories={monthLabels}
          series={[
            { name: "OrderShippedCount", data: slice(ALL_SHIPPED), tone: "info" },
            { name: "OrderCreatedCount", data: slice(ALL_CREATED), tone: "success" },
          ]}
        />
        <TrendChart
          height={150}
          categories={monthLabels}
          series={[{ name: "Client", data: slice(ALL_CLIENTS), tone: "warning" }]}
        />
      </Stack>

      <Callout tone="info">
        On DeliverrLiveDB the IDs you supplied are clients of one company,
        Flexport, so they appear in the Client column. On the other six databases
        each ID is a company and its clients are not broken out, so those rows show
        "all clients" and the Client series is a distinct-depositor count. Pivot
        figures tie out to your PDF export: Flexport HUB LAX1 shows 257,799 /
        266,999 for Jun 2024 and Flexport HUB EWR1 shows 330,581 / 334,590. One PDF
        row, ORD13P-Del..., is not among the IDs you supplied, so it is absent here.
      </Callout>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 - the dashboard built from the MSSQL pull, plus its analysis
// ---------------------------------------------------------------------------

// Continuing accounts only - the 42 still shipping in the latest TTM, so the offboarded
// Flexport clients are excluded from every figure below.
const CONT_TTM_PREV_CREATED = sumRange(CONT_CREATED, 3, 14);
const CONT_TTM_CURR_CREATED = sumRange(CONT_CREATED, 15, 26);
const CONT_TTM_PREV_SHIPPED = sumRange(CONT_SHIPPED, 3, 14);
const CONT_TTM_CURR_SHIPPED = sumRange(CONT_SHIPPED, 15, 26);
const CONT_TTM_YOY_CREATED = pctChange(CONT_TTM_CURR_CREATED, CONT_TTM_PREV_CREATED);
const CONT_TTM_YOY_SHIPPED = pctChange(CONT_TTM_CURR_SHIPPED, CONT_TTM_PREV_SHIPPED);
const CONT_TTM_PREV_FILL = (100 * CONT_TTM_PREV_SHIPPED) / CONT_TTM_PREV_CREATED;
const CONT_TTM_CURR_FILL = (100 * CONT_TTM_CURR_SHIPPED) / CONT_TTM_CURR_CREATED;

const CONT_LAST_FULL_YOY_SHIPPED = pctChange(CONT_SHIPPED[26], CONT_SHIPPED[14]);
const CONT_LAST_FULL_YOY_CREATED = pctChange(CONT_CREATED[26], CONT_CREATED[14]);

function DashboardTab() {
  const [db, setDb] = useCanvasState("db", "all");
  const [company, setCompany] = useCanvasState("dash-company", "all");
  const [quarter, setQuarter] = useCanvasState("dash-quarter", "all");
  const [month, setMonth] = useCanvasState("dash-month", "none");

  const selectedRange = resolvePeriod(quarter, month);
  const { from, to } = selectedRange;
  const monthLabels = MONTH_LABELS.slice(from, to + 1);

  const inDatabase = useMemo(
    () => (db === "all" ? COMPANY_TOTALS : COMPANY_TOTALS.filter((r) => r.db === db)),
    [db],
  );

  const companyOptions = useMemo(
    () => inDatabase.map((r) => r.company),
    [inDatabase],
  );

  const scopeEntities = useMemo(() => {
    let rows = ENTITIES;
    if (db !== "all") rows = rows.filter((r) => r.db === db);
    if (company !== "all" && inDatabase.some((r) => r.company === company)) {
      rows = rows.filter((r) => r.company === company);
    }
    return rows;
  }, [db, company, inDatabase]);

  const filtered = useMemo(
    () => periodTotals(scopeEntities, from, to),
    [scopeEntities, from, to],
  );

  const dbPeriod = useMemo(() => {
    const byDb = new Map<
      string,
      { created: number; shipped: number; clientMonths: number[] }
    >();
    for (const row of scopeEntities) {
      const existing = byDb.get(row.db);
      if (!existing) {
        byDb.set(row.db, {
          created: sumRange(row.created, from, to),
          shipped: sumRange(row.shipped, from, to),
          clientMonths: [...row.clients],
        });
      } else {
        existing.created += sumRange(row.created, from, to);
        existing.shipped += sumRange(row.shipped, from, to);
        for (let i = 0; i < existing.clientMonths.length; i += 1) {
          existing.clientMonths[i] += row.clients[i];
        }
      }
    }
    return [...byDb.entries()]
      .map(([dbName, r]) => {
        let clientsPeak = 0;
        for (let i = from; i <= to; i += 1) {
          if (r.clientMonths[i] > clientsPeak) clientsPeak = r.clientMonths[i];
        }
        return { db: dbName, created: r.created, shipped: r.shipped, clientsPeak };
      })
      .sort((a, b) => b.shipped - a.shipped);
  }, [scopeEntities, from, to]);

  const scopeCreated = useMemo(() => seriesSum(scopeEntities, "created"), [scopeEntities]);
  const scopeShipped = useMemo(() => seriesSum(scopeEntities, "shipped"), [scopeEntities]);
  const scopeClients = useMemo(() => seriesSum(scopeEntities, "clients"), [scopeEntities]);
  const chartCreated = scopeCreated.slice(from, to + 1);
  const chartShipped = scopeShipped.slice(from, to + 1);
  const chartClients = scopeClients.slice(from, to + 1);
  const clientsPeak = chartClients.length === 0 ? 0 : Math.max(0, ...chartClients);
  const portfolioView = company === "all";

  const created = filtered.reduce((s, r) => s + r.created, 0);
  const shipped = filtered.reduce((s, r) => s + r.shipped, 0);
  const fill = created === 0 ? 0 : (100 * shipped) / created;
  const top = filtered.slice(0, 12);

  const last = scopeCreated.length - 1;
  const isMonth = month !== "none";
  const isAllTime = !isMonth && (quarter === "all" || quarter === "none");
  const scopeYoyCreated = isAllTime
    ? pctChange(scopeCreated[last], scopeCreated[last - 12])
    : alignedYoy(scopeCreated, from, to);
  const scopeYoyShipped = isAllTime
    ? pctChange(scopeShipped[last], scopeShipped[last - 12])
    : alignedYoy(scopeShipped, from, to);
  const priorLen = to - from + 1;
  const priorFrom = from - priorLen;
  const priorTo = from - 1;
  const hasPriorPeriod = priorFrom >= 0;
  const showSeq = isAllTime || hasPriorPeriod;
  const scopeSeqCreated = isAllTime
    ? pctChange(scopeCreated[last], scopeCreated[last - 1])
    : pctChange(sumRange(scopeCreated, from, to), sumRange(scopeCreated, priorFrom, priorTo));
  const scopeSeqShipped = isAllTime
    ? pctChange(scopeShipped[last], scopeShipped[last - 1])
    : pctChange(sumRange(scopeShipped, from, to), sumRange(scopeShipped, priorFrom, priorTo));

  const yoyLabel = isAllTime
    ? "YoY (Aug 2026 vs Aug 2025)"
    : isMonth
      ? "YoY vs same month last year"
      : "YoY vs same quarter last year";
  const seqLabel = isAllTime
    ? "MoM (Aug vs Jul 2026)"
    : isMonth
      ? "vs prior month"
      : "vs prior quarter";

  const peakIn = (values: number[], a: number, b: number) => {
    let m = 0;
    for (let i = a; i <= b; i += 1) {
      if (values[i] > m) m = values[i];
    }
    return m;
  };
  const clientsYoy =
    from >= 12
      ? pctChange(peakIn(scopeClients, from, to), peakIn(scopeClients, from - 12, to - 12))
      : 0;

  const offboardedRows = useMemo(
    () =>
      OFFBOARDED.filter(
        (r) =>
          (db === "all" || r.db === db) &&
          (company === "all" || entityCompany(r) === company),
      ),
    [db, company],
  );

  const moverFrom = isAllTime ? 15 : from;
  const moverTo = isAllTime ? 26 : to;
  const { decliners: declinerRows, growers: growerRows } = useMemo(
    () => companyMovers(scopeEntities, moverFrom, moverTo),
    [scopeEntities, moverFrom, moverTo],
  );
  const moverPriorLabel = isAllTime
    ? "Prior TTM"
    : isMonth
      ? "Same month last year"
      : "Same quarter last year";
  const moverCurrLabel = isAllTime ? "Current TTM" : isMonth ? "This month" : "This quarter";

  const fillRows = useMemo(
    () =>
      FILL_OUTLIERS.filter(
        (r) =>
          (db === "all" || r.db === db) &&
          (company === "all" || r.company === company || entityCompany(r) === company),
      ),
    [db, company],
  );

  const ttmYoy = pctChange(TTM_CURR_SHIPPED, TTM_PREV_SHIPPED);
  const continuingYoy = pctChange(CONTINUING_CURR, CONTINUING_PREV);
  const flexportShareOfDrop =
    (100 * (FLEXPORT_TTM.prev - FLEXPORT_TTM.curr)) /
    (TTM_PREV_SHIPPED - TTM_CURR_SHIPPED);

  const scopeLabel =
    company !== "all" && filtered.length === 1
      ? company
      : db === "all"
        ? "all databases"
        : db;

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <Text tone="secondary">
          Order created vs shipped for all 69 IDs you supplied across three servers
          and seven databases, Jun 2024 - Aug 2026. Test companies excluded. The 27
          DeliverrLiveDB IDs are clients of one company, Flexport, so company-grain
          views below count them once.
        </Text>
        <Row gap={8} wrap>
          <Pill>69 IDs mapped</Pill>
          <Pill>40 companies with volume</Pill>
          <Pill>57 company/client accounts</Pill>
          <Pill>Snapshot, not live</Pill>
        </Row>
      </Stack>

      <Callout tone="warning">
        Shipped volume fell {fmtPct(ttmYoy)} year over year, and one company
        explains almost all of it: Flexport went from{" "}
        {FLEXPORT_TTM.prev.toLocaleString()} shipped orders in the prior twelve
        months to {FLEXPORT_TTM.curr.toLocaleString()}, as 12 of its 18 client
        accounts stopped producing orders. That is {flexportShareOfDrop.toFixed(0)}%
        of the total decline. Excluding accounts that shipped nothing in the latest twelve months, the
        remaining {CONTINUING_COUNT} are down {fmtPct(continuingYoy)}.
      </Callout>

      <Row gap={16} align="center" wrap>
        <Row gap={8} align="center">
          <Text weight="semibold">Database</Text>
          <Select
            value={db}
            onChange={setDb}
            options={[
              { value: "all", label: "All databases" },
              ...DB_TOTALS.map((r) => ({ value: r.db, label: r.db })),
            ]}
          />
        </Row>
        <Row gap={8} align="center">
          <Text weight="semibold">Company</Text>
          <Select
            value={company}
            onChange={setCompany}
            options={[
              { value: "all", label: "All companies" },
              ...companyOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Row>
        <PeriodFilters
          quarter={quarter}
          month={month}
          onQuarter={setQuarter}
          onMonth={setMonth}
        />
      </Row>

      <Grid columns={4} gap={16}>
        <Stat value={fmt(created)} label="Orders created (period)" />
        <Stat value={fmt(shipped)} label="Orders shipped (period)" />
        <Stat value={`${fill.toFixed(1)}%`} label="Shipped / created" />
        <Stat value={String(clientsPeak)} label="Peak monthly clients" />
      </Grid>

      <Grid columns={showSeq ? 4 : 2} gap={16}>
        <Stat
          value={fmtPct(scopeYoyCreated)}
          label={`Created ${yoyLabel}`}
          tone={scopeYoyCreated < 0 ? "danger" : "success"}
        />
        <Stat
          value={fmtPct(scopeYoyShipped)}
          label={`Shipped ${yoyLabel}`}
          tone={scopeYoyShipped < 0 ? "danger" : "success"}
        />
        {showSeq ? (
          <>
            <Stat
              value={fmtPct(scopeSeqCreated)}
              label={`Created ${seqLabel}`}
              tone={scopeSeqCreated < 0 ? "danger" : "success"}
            />
            <Stat
              value={fmtPct(scopeSeqShipped)}
              label={`Shipped ${seqLabel}`}
              tone={scopeSeqShipped < 0 ? "danger" : "success"}
            />
          </>
        ) : null}
      </Grid>
      <Grid columns={2} gap={16}>
        <Stat value={String(filtered.length)} label="Companies with volume" />
        <Stat
          value={fmtPct(clientsYoy)}
          label="Peak clients YoY"
          tone={clientsYoy < 0 ? "danger" : "success"}
        />
      </Grid>

      <Text tone="tertiary">
        Totals, charts, and change percentages follow Database, Company, and either
        Quarter or Month - never both at once. Choosing a month sets Quarter to
        Not used, and choosing a quarter sets Month to Not used. YoY is the same
        period a year earlier. August 2026 is a complete month | {scopeLabel} |{" "}
        {selectedRange.label}
      </Text>

      <Stack gap={8}>
        <H2>
          {portfolioView ? "All accounts" : company} - created vs shipped per month
        </H2>
        <Text tone="tertiary">
          Source: MSSQL | {selectedRange.label} | {scopeLabel} | orders
        </Text>
        <TrendChart
          height={280}
          categories={monthLabels}
          series={[
            { name: "OrderCreatedCount", data: chartCreated, tone: "info" },
            { name: "OrderShippedCount", data: chartShipped, tone: "success" },
          ]}
          fill
        />
        <TrendChart
          height={150}
          categories={monthLabels}
          series={[{ name: "Clients", data: chartClients, tone: "warning" }]}
        />
        <Text tone="tertiary">
          Distinct clients with created orders that month, summed across companies
          in the selection. Split from the volume chart because the scales differ.
        </Text>
      </Stack>

      {db === "all" && portfolioView ? (
        <>
      <Stack gap={8}>
        <H2>Continuing accounts only - created vs shipped per month</H2>
        <Text tone="tertiary">
          Source: MSSQL | {selectedRange.label} | {CONTINUING_COUNT} accounts still
          shipping in the latest twelve months | orders. With the offboarded
          Flexport clients removed, demand is roughly flat at 500-650K created per
          month.
        </Text>
        <TrendChart
          height={260}
          categories={monthLabels}
          series={[
            { name: "Created (continuing)", data: CONT_CREATED.slice(from, to + 1), tone: "info" },
            { name: "Shipped (continuing)", data: CONT_SHIPPED.slice(from, to + 1), tone: "success" },
          ]}
          fill
        />

        <Grid columns={4} gap={16}>
          <Stat
            value={fmtPct(CONT_TTM_YOY_SHIPPED)}
            label="Shipped TTM YoY (continuing)"
            tone="danger"
          />
          <Stat
            value={fmtPct(CONT_TTM_YOY_CREATED)}
            label="Created TTM YoY (continuing)"
            tone="success"
          />
          <Stat
            value={fmtPct(CONT_LAST_FULL_YOY_SHIPPED)}
            label="Shipped YoY, Aug 2026"
            tone="danger"
          />
          <Stat
            value={`${CONT_TTM_CURR_FILL.toFixed(1)}%`}
            label="Shipped / created, current TTM"
            tone="danger"
          />
        </Grid>

        <Text tone="tertiary">
          TTM = Sep 2025-Aug 2026 vs Sep 2024-Aug 2025.{" "}
          {CONT_TTM_PREV_SHIPPED.toLocaleString()} shipped orders became{" "}
          {CONT_TTM_CURR_SHIPPED.toLocaleString()}, while created orders rose from{" "}
          {CONT_TTM_PREV_CREATED.toLocaleString()} to{" "}
          {CONT_TTM_CURR_CREATED.toLocaleString()}. Created is up{" "}
          {fmtPct(CONT_TTM_YOY_CREATED)} and shipped is down{" "}
          {fmtPct(CONT_TTM_YOY_SHIPPED)}, so fill fell from{" "}
          {CONT_TTM_PREV_FILL.toFixed(1)}% to {CONT_TTM_CURR_FILL.toFixed(1)}% -
          the gap is mostly Accurate Freight Systems, which creates orders that
          never record a shipment. Aug 2026 created is{" "}
          {fmtPct(CONT_LAST_FULL_YOY_CREATED)} YoY.
        </Text>
      </Stack>
        </>
      ) : null}

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Top companies by shipped, created, and clients</CardHeader>
          <CardBody>
            <BarChart
              horizontal
              height={360}
              categories={top.map((r) => r.company)}
              series={[
                { name: "OrderShippedCount", data: top.map((r) => r.shipped), tone: "success" },
                { name: "OrderCreatedCount", data: top.map((r) => r.created), tone: "info" },
                { name: "Peak monthly clients", data: top.map((r) => r.clientsPeak), tone: "warning" },
              ]}
            />
            <Text tone="tertiary">
              Source: MSSQL | {selectedRange.label} | {scopeLabel} | sorted by
              shipped. Peak monthly clients is on the same chart; the table below
              is the readable scale for that series.
            </Text>
            <Table
              headers={["Company", "Shipped", "Created", "Peak clients"]}
              columnAlign={["left", "right", "right", "right"]}
              rows={top.map((r) => [
                r.company,
                r.shipped.toLocaleString(),
                r.created.toLocaleString(),
                String(r.clientsPeak),
              ])}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Volume by database</CardHeader>
          <CardBody>
            <BarChart
              horizontal
              height={360}
              categories={dbPeriod.map((r) => r.db)}
              series={[
                { name: "Created", data: dbPeriod.map((r) => r.created), tone: "info" },
                { name: "Shipped", data: dbPeriod.map((r) => r.shipped), tone: "success" },
                { name: "Peak monthly clients", data: dbPeriod.map((r) => r.clientsPeak), tone: "warning" },
              ]}
            />
            <Text tone="tertiary">
              Source: MSSQL | {selectedRange.label} | {scopeLabel} | orders and
              peak monthly clients
            </Text>
            <Table
              headers={["Database", "Shipped", "Created", "Peak clients"]}
              columnAlign={["left", "right", "right", "right"]}
              rows={dbPeriod.map((r) => [
                r.db,
                r.shipped.toLocaleString(),
                r.created.toLocaleString(),
                String(r.clientsPeak),
              ])}
            />
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H2>Where the volume went - offboarded accounts</H2>
        <Text tone="tertiary">
          Source: MSSQL | prior-year TTM shipped orders for accounts with no 2026
          activity | orders lost. All but Knight Swift are Flexport clients.
        </Text>
        <BarChart
          horizontal
          height={240}
          categories={offboardedRows.slice(0, 6).map((r) => entityClient(r) || r.company)}
          series={[{ name: "Prior-year shipped orders now at zero", data: offboardedRows.slice(0, 6).map((r) => r.lost), tone: "danger" }]}
        />
        <Table
          headers={["Database", "Company", "Client", "Last active month", "Prior-year shipped"]}
          columnAlign={["left", "left", "left", "left", "right"]}
          rows={offboardedRows.map((r) => [
            r.db,
            entityCompany(r),
            entityClient(r) || "-",
            r.lastActive,
            r.lost.toLocaleString(),
          ])}
        />
      </Stack>

      {declinerRows.length > 0 || growerRows.length > 0 ? (
      <Grid columns={declinerRows.length > 0 && growerRows.length > 0 ? 2 : 1} gap={16}>
        {declinerRows.length > 0 ? (
        <Card>
          <CardHeader>Shrinking companies (still shipping)</CardHeader>
          <CardBody>
            <Text tone="tertiary">
              Source: MSSQL | shipped orders | {selectedRange.label} vs the same
              months a year earlier. Still-active companies only. Top 8 by drop.
            </Text>
            <Table
              headers={["Company", moverPriorLabel, moverCurrLabel, "YoY", "Peak clients"]}
              columnAlign={["left", "right", "right", "right", "right"]}
              rows={declinerRows.map((r) => [
                r.company,
                r.prev.toLocaleString(),
                r.curr.toLocaleString(),
                fmtPct(r.yoy),
                String(r.clients),
              ])}
            />
          </CardBody>
        </Card>
        ) : null}
        {growerRows.length > 0 ? (
        <Card>
          <CardHeader>Growing companies</CardHeader>
          <CardBody>
            <Text tone="tertiary">
              Source: MSSQL | shipped orders | {selectedRange.label} vs the same
              months a year earlier. Top 8 by YoY among companies still shipping.
            </Text>
            <Table
              headers={["Company", moverPriorLabel, moverCurrLabel, "YoY", "Peak clients"]}
              columnAlign={["left", "right", "right", "right", "right"]}
              rows={growerRows.map((r) => [
                r.company,
                r.prev.toLocaleString(),
                r.curr.toLocaleString(),
                fmtPct(r.yoy),
                String(r.clients),
              ])}
            />
          </CardBody>
        </Card>
        ) : null}
      </Grid>
      ) : null}

      <Stack gap={8}>
        <H2>Revenue-risk concentration</H2>
        <Text tone="tertiary">
          Source: MSSQL | TTM shipped orders | share of the 5.22M total. Pepsi alone
          is 29% of remaining volume, so one account now drives the trend.
        </Text>
        <BarChart
          horizontal
          height={250}
          categories={CONCENTRATION.map((r) => r.company)}
          series={[{ name: "Share of TTM shipped orders", data: CONCENTRATION.map((r) => r.share), tone: "info" }]}
          valueSuffix="%"
        />
      </Stack>

      <Stack gap={8}>
        <H2>Company totals</H2>
        <Text tone="tertiary">
          {selectedRange.label} | company grain, so Flexport is one row covering its
          18 clients | {scopeLabel}
        </Text>
        <Table
          striped
          headers={["Database", "Company", "Created", "Shipped", "Fill %", "Peak clients"]}
          columnAlign={["left", "left", "right", "right", "right", "right"]}
          rows={filtered.map((r) => [
            r.db,
            r.company,
            r.created.toLocaleString(),
            r.shipped.toLocaleString(),
            r.fill.toFixed(1),
            String(r.clientsPeak),
          ])}
        />
      </Stack>

      <Stack gap={8}>
        <H2>Data quality - created vs shipped mismatches</H2>
        <Text tone="tertiary">
          Source: MSSQL | TTM | accounts where shipped/created falls outside 90-105%
        </Text>
        <Table
          headers={["Database", "Company", "Created", "Shipped", "Fill %"]}
          columnAlign={["left", "left", "right", "right", "right"]}
          rows={fillRows.map((r) => [
            r.db,
            r.company,
            r.created.toLocaleString(),
            r.shipped.toLocaleString(),
            r.fill.toFixed(1),
          ])}
        />
        <Text tone="tertiary">
          Accurate Freight Systems is the extreme case: 1.50M created against 55K
          shipped. Either an integration creates orders that never ship, or
          shipments are recorded outside SHIP_SHIPMENTDATETIME.
        </Text>
      </Stack>

      <Callout tone="info">
        Created = distinct warehouse orders by CreatedDate. Shipped on six
        databases = distinct warehouse-order IDs on LSHP_SHIPMENT; DeliverrLiveDB
        shipped is shipment row count because the distinct-order query timed out.
        Clients = distinct depositors with created orders that month (summed
        across companies in a selection). Peak clients is the highest of those
        monthly counts in the selected period. Listed IDs with no rows in range
        include Deliverr ATL2RS, EWR1CD, Flexport ATL1RS/ORD1RS, GPA Logistics,
        Pixior Santa Fe Springs and STO_PXR_VRN.
      </Callout>
    </Stack>
  );
}

export default function WmsMigratedCustomerDashboard() {
  const [tab, setTab] = useCanvasState("tab", "datastudio");

  return (
    <Stack gap={20}>
      <Stack gap={12}>
        <H1>WMS migrated customer reporting</H1>
        <Row gap={8}>
          <Pill active={tab === "datastudio"} onClick={() => setTab("datastudio")}>
            Data Studio report
          </Pill>
          <Pill active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            WMS migrated customer dashboard
          </Pill>
        </Row>
      </Stack>

      {tab === "datastudio" ? <DataStudioTab /> : <DashboardTab />}
    </Stack>
  );
}
