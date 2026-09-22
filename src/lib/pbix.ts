import { strToU8, zipSync } from "fflate";

const utf16 = (value: string) => {
  const bytes = new Uint8Array(value.length * 2);
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  return bytes;
};

const contentTypes = `\uFEFF<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="" /><Override PartName="/Version" ContentType="" /><Override PartName="/Report/Layout" ContentType="" /><Override PartName="/Settings" ContentType="" /><Override PartName="/Metadata" ContentType="" /><Override PartName="/Connections" ContentType="" /></Types>`;

const POWER_BI_DESKTOP_CLIENT_ID = "929d0ec0-7a41-4b1e-bc7c-b754a28bddcc";

export function liveConnectionString(datasetId: string) {
  return `Data Source=pbiazure://api.powerbi.com;Initial Catalog=${datasetId};Identity Provider="https://login.microsoftonline.com/common, https://analysis.windows.net/powerbi/api, ${POWER_BI_DESKTOP_CLIENT_ID}";Integrated Security=ClaimsToken`;
}

export function buildThinPbix(layout: unknown, datasetId: string) {
  const connections = {
    Version: 1,
    Connections: [
      {
        Name: "EntityDataSource",
        ConnectionString: liveConnectionString(datasetId),
        ConnectionType: "pbiServiceLive",
        PbiServiceModelId: null,
        PbiModelVirtualServerName: "sobe_wowvirtualserver",
        PbiModelDatabaseName: datasetId,
      },
    ],
  };

  const zip = zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    Version: utf16("1.28"),
    Connections: strToU8(JSON.stringify(connections)),
    "Report/Layout": utf16(JSON.stringify(layout)),
    Settings: utf16(JSON.stringify({ Version: 4, ReportSettings: {}, QueriesSettings: { TypeDetectionEnabled: true, RelationshipImportEnabled: true } })),
    Metadata: utf16(JSON.stringify({ Version: 5, AutoCreatedRelationships: [], CreatedFrom: "Cloud", CreatedFromRelease: "2024.06" })),
  });
  return new Blob([zip], { type: "application/octet-stream" });
}
