/* MHS+ GPR Report — PDF builder. Pure function of app state. */
(function (g) {
  const NAVY = [27, 42, 58], AMBER = [200, 144, 46], INK = [30, 35, 40], GREY = [95, 105, 115], LINE = [205, 211, 216];
  const STATUS = {
    clear: { label: 'Clear to proceed', rgb: [46, 125, 79] },
    restricted: { label: 'Proceed with restrictions', rgb: [191, 128, 20] },
    notfeasible: { label: 'Not feasible at marked position', rgb: [179, 38, 30] },
    '': { label: 'Status not set', rgb: [120, 120, 120] }
  };
  const v = (x) => (x == null ? '' : String(x).trim());
  const velocity = (er) => { const e = parseFloat(er); return e > 0 ? 0.2998 / Math.sqrt(e) : null; };

  function buildReport(S, jsPDF) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 18, CW = W - 2 * M;
    const J = S.job, C = S.company, I = S.instrument;
    let y = 0;

    const text = (t, x, yy, o = {}) => {
      doc.setFont('helvetica', o.bold ? 'bold' : o.italic ? 'italic' : 'normal');
      doc.setFontSize(o.size || 9.5); doc.setTextColor(...(o.color || INK));
      doc.text(t, x, yy, o.align ? { align: o.align } : undefined);
    };
    const para = (t, o = {}) => {
      if (!v(t)) return;
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size || 9.5); doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(v(t), o.width || CW); const lh = (o.size || 9.5) * 0.45;
      for (const ln of lines) { ensure(lh + 1); doc.text(ln, M, y); y += lh; }
      y += o.after == null ? 3 : o.after;
    };
    const heading = (t) => { ensure(14); y += 2; text(t, M, y, { bold: true, size: 12.5, color: NAVY });
      doc.setDrawColor(...AMBER); doc.setLineWidth(0.6); doc.line(M, y + 1.8, M + 16, y + 1.8); y += 8; };
    const newPage = () => { doc.addPage(); y = 26; };
    const ensure = (h) => { if (y + h > H - 20) newPage(); };
    const kv = (rows) => {
      doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid', body: rows.filter(r => v(r[1])),
        styles: { font: 'helvetica', fontSize: 8.8, cellPadding: 2.2, lineColor: LINE, lineWidth: 0.2, textColor: INK },
        columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold', fillColor: [238, 241, 244] } } });
      y = doc.lastAutoTable.finalY + 5;
    };
    const image = (src, x, yy, maxW, maxH) => {
      try {
        const p = doc.getImageProperties(src); const r = Math.min(maxW / p.width, maxH / p.height);
        const w = p.width * r, h = p.height * r;
        doc.addImage(src, src.includes('image/png') ? 'PNG' : 'JPEG', x + (maxW - w) / 2, yy, w, h);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(x + (maxW - w) / 2, yy, w, h);
        return h;
      } catch (e) { return 0; }
    };
    const caption = (t, x, yy, w) => text(doc.splitTextToSize(t, w), x + w / 2, yy, { size: 7.8, italic: true, color: GREY, align: 'center' });

    /* ---------- Cover ---------- */
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 92, 'F');
    doc.setFillColor(...AMBER); doc.rect(0, 92, W, 2, 'F');
    if (C.logo) image(C.logo, M, 14, 40, 22);
    text(v(C.name) || 'Company name', M, C.logo ? 46 : 26, { bold: true, size: 13, color: [255, 255, 255] });
    text([v(C.address), v(C.website)].filter(Boolean).join('   |   '), M, C.logo ? 52 : 32, { size: 8.5, color: [200, 210, 220] });
    text('GPR Scanning Report', M, 72, { bold: true, size: 24, color: [255, 255, 255] });
    text('Ground penetrating radar investigation of concrete elements', M, 80, { size: 10, color: [220, 228, 235] });
    y = 110;
    kv([['Report no.', J.reportNo], ['Revision', J.rev], ['Date of issue', J.date], ['Project', J.project],
        ['Site location', J.location], ['Client', J.client], ['Client reference', J.clientRef], ['Date(s) of scanning', J.scanDate]]);
    heading('Document control');
    doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid',
      head: [['Role', 'Name', 'Signature', 'Date']],
      body: [['Prepared by', v(J.preparedBy), '', v(J.date)], ['Reviewed by', v(J.reviewedBy), '', v(J.date)], ['Approved by', v(J.approvedBy), '', v(J.date)]],
      styles: { fontSize: 9, cellPadding: 3.2, lineColor: LINE, lineWidth: 0.2, textColor: INK, minCellHeight: 11 },
      headStyles: { fillColor: NAVY, textColor: 255 } });
    y = doc.lastAutoTable.finalY + 6;
    if (v(J.revNotes)) para('Revision notes: ' + J.revNotes, { size: 8.5 });

    /* ---------- Introduction ---------- */
    newPage(); heading('1. Introduction and scope');
    para(J.scope);
    if (J.siteMap) { ensure(95); const h = image(J.siteMap, M, y, CW, 90); y += h + 3; caption('Figure 1. Site location / scan area plan', M, y + 1, CW); y += 7; }
    heading('2. Methodology');
    para(C.methodology);

    /* ---------- Instrument ---------- */
    heading('3. Equipment and calibration');
    kv([['Instrument', I.model], ['Serial number', I.serial], ['Antenna / frequency', I.antenna],
        ['Calibrated by', I.calBy], ['Certificate no.', I.certNo], ['Calibration date', I.calDate], ['Valid until', I.calDue]]);
    if (I.certImage) { newPage(); heading('Calibration certificate'); const h = image(I.certImage, M, y, CW, 225); y += h + 4; }

    /* ---------- Site photos ---------- */
    if ((J.photos || []).length) {
      newPage(); heading('4. Site images');
      const cw = (CW - 6) / 2, ch = 70; let col = 0;
      J.photos.forEach((p, i) => {
        if (col === 0) ensure(ch + 12);
        const x = M + col * (cw + 6); image(p.src, x, y, cw, ch); caption(v(p.caption) || `Photo ${i + 1}`, x, y + ch + 4, cw);
        col = 1 - col; if (col === 0) y += ch + 12;
      });
      if (col === 1) y += ch + 12;
    }

    /* ---------- Locations ---------- */
    S.locations.forEach((L, i) => {
      newPage();
      const st = STATUS[L.status || ''];
      text(`Location ${v(L.id) || i + 1}`, M, y, { bold: true, size: 14, color: NAVY });
      doc.setFillColor(...st.rgb); const lw = doc.getTextWidth(st.label) * (8.5 / 9.5) + 8;
      doc.roundedRect(W - M - lw - 2, y - 5, lw + 2, 7, 1.5, 1.5, 'F');
      text(st.label, W - M - (lw + 2) / 2, y - 0.4, { size: 8.5, bold: true, color: [255, 255, 255], align: 'center' });
      y += 5; para(L.description, { size: 10, after: 2 });
      const vel = velocity(L.er);
      kv([['Scan type / area', L.scanType], ['Dielectric constant', v(L.er) && (L.er + (vel ? `   (v = ${vel.toFixed(3)} m/ns)` : ''))],
          ['Velocity method', L.erMethod], ['Top reinforcement', [v(L.orientation), v(L.spacing) && L.spacing + ' c/c'].filter(Boolean).join(', ')],
          ['Concrete cover', L.cover], ['Bottom reinforcement', L.bottom], ['Other targets', L.targets],
          ['Slab thickness', L.thickness], ['Anomalies', L.anomalies]]);
      const hasA = !!L.photo, hasB = !!L.scan;
      if (hasA || hasB) {
        const n = (hasA ? 1 : 0) + (hasB ? 1 : 0), cw = n === 2 ? (CW - 6) / 2 : CW, ch = n === 2 ? 72 : 95;
        ensure(ch + 12); let x = M, hmax = 0; const caps = [];
        if (hasA) { const h = image(L.photo, x, y, cw, ch); caps.push(['Marked-up site photo', x]); hmax = Math.max(hmax, h); x += cw + 6; }
        if (hasB) { const h = image(L.scan, x, y, cw, ch); caps.push(['GPR scan image', x]); hmax = Math.max(hmax, h); }
        caps.forEach(([t, cx]) => caption(t, cx, y + hmax + 4, cw));
        y += hmax + 11;
      }
      if (v(L.result)) { ensure(16); text('Result', M, y, { bold: true, size: 10.5, color: NAVY }); y += 5.5; para(L.result); }
      if (v(L.conclusion)) { ensure(16); text("Engineer's conclusion", M, y, { bold: true, size: 10.5, color: NAVY }); y += 5.5; para(L.conclusion); }
    });

    /* ---------- Summary ---------- */
    newPage(); heading('Summary of findings');
    if (v(S.summary)) para(S.summary);
    doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid',
      head: [['Loc.', 'Description', 'Top bars', 'Cover', 'Other targets', 'Status']],
      body: S.locations.map((L, i) => [v(L.id) || String(i + 1), v(L.description), v(L.spacing), v(L.cover), v(L.targets) || '-', STATUS[L.status || ''].label]),
      styles: { fontSize: 8, cellPadding: 2, lineColor: LINE, lineWidth: 0.2, textColor: INK, valign: 'top' },
      headStyles: { fillColor: NAVY, textColor: 255 },
      columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 22 }, 3: { cellWidth: 20 }, 5: { cellWidth: 30 } },
      didParseCell: (d) => { if (d.section === 'body' && d.column.index === 5) { const L = S.locations[d.row.index]; d.cell.styles.textColor = STATUS[L.status || ''].rgb; d.cell.styles.fontStyle = 'bold'; } } });
    y = doc.lastAutoTable.finalY + 8;
    heading('Limitations');
    para(C.limitations, { size: 8.8 });

    /* ---------- Header / footer on every page ---------- */
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      if (p > 1) {
        doc.setFillColor(...NAVY); doc.rect(0, 0, W, 12, 'F'); doc.setFillColor(...AMBER); doc.rect(0, 12, W, 0.8, 'F');
        text(v(C.name), M, 7.8, { bold: true, size: 8.5, color: [255, 255, 255] });
        text(`${v(J.reportNo)}  Rev ${v(J.rev)}`, W - M, 7.8, { size: 8.5, color: [255, 255, 255], align: 'right' });
      }
      doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 13, W - M, H - 13);
      text(v(J.project), M, H - 8.5, { size: 7.5, color: GREY });
      text(`Page ${p} of ${n}`, W - M, H - 8.5, { size: 7.5, color: GREY, align: 'right' });
    }
    doc.setProperties({ title: `${v(J.reportNo)} GPR Scanning Report`, author: v(C.name), subject: v(J.project) });
    return doc;
  }
  g.buildReport = buildReport; g.GPR_STATUS = STATUS; g.gprVelocity = velocity;
})(typeof window !== 'undefined' ? window : globalThis);
