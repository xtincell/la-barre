// montage-son-du-moment.swift — l'animatique de la piste « Le son du moment » (Bonnet Rouge, EOTY 2026).
//
// Demande d'Alex (07/10/2026) : « fais un montage avec ses images de storyboard sur le son ci,
// la musique fait 30 s, motion design ». Le Mac n'a pas ffmpeg : tout passe par AVFoundation.
//
// Le son : le morceau fait 48,8 s. On en garde 30 : de la montée (8,50 s) au milieu du refrain
// (35,38 s), puis les deux dernières mesures du morceau (45,55 s → fin), raccordées sur un temps
// fort. Le drop (13,35 s) tombe à 4,85 s du montage, comme le storyboard le demande (plan 3).
// Jusqu'au drop, le son passe par un filtre « vieille radio ».
// Tempo relevé : ~141,7 BPM, une mesure = 1,694 s.
//
// DEBIT=1500000 pour une version web plus légère.
// Usage : swift outils/montage-son-du-moment.swift <son.mp3> <dossier des planches> <logo.png> <vague-signature.png> <sortie.mp4>

import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count == 6 else { print("usage : son.mp3 dossier-planches logo.png vague.png sortie.mp4"); exit(1) }
let sonURL = URL(fileURLWithPath: args[1]), dossier = args[2], logoURL = URL(fileURLWithPath: args[3])
let vagueURL = URL(fileURLWithPath: args[4]), sortie = URL(fileURLWithPath: args[5])
let travail = sortie.deletingLastPathComponent()
let videoSeule = travail.appendingPathComponent("_video.mp4"), sonSeul = travail.appendingPathComponent("_son.m4a")
for u in [videoSeule, sonSeul, sortie] { try? FileManager.default.removeItem(at: u) }

let W = 1280, H = 720, FPS = 30, DUREE = 30.0
let DROP = 4.85, MESURE = 1.694, TEMPS = MESURE / 4

// ───────────────────────── Le son ─────────────────────────
let fichier = try AVAudioFile(forReading: sonURL)
let fmt = fichier.processingFormat
let sr = fmt.sampleRate, nc = Int(fmt.channelCount)
let tout = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(fichier.length))!
try fichier.read(into: tout)
func canal(_ c: Int) -> UnsafeMutablePointer<Float> { tout.floatChannelData![min(c, nc - 1)] }

let aDebut = 8.50, aFin = 35.38, bDebut = 45.55, bFin = 48.80, fondu = 0.12
let nOut = Int(DUREE * sr)
var out = [[Float]](repeating: [Float](repeating: 0, count: nOut), count: 2)
let joint = aFin - aDebut   // 26,88 s dans le montage
for c in 0..<2 {
  let src = canal(c)
  for i in 0..<nOut {
    let t = Double(i) / sr
    var v: Float = 0
    // Segment A, qui s'éteint sur le fondu du joint
    let ta = aDebut + t
    if t < joint + fondu / 2 {
      let g = t < joint - fondu / 2 ? 1.0 : max(0, (joint + fondu / 2 - t) / fondu)
      let k = Int(ta * sr); if k < Int(tout.frameLength) { v += src[k] * Float(g) }
    }
    // Segment B, qui monte sur le fondu
    if t > joint - fondu / 2 {
      let tb = bDebut + (t - joint)
      let g = t > joint + fondu / 2 ? 1.0 : max(0, (t - (joint - fondu / 2)) / fondu)
      let k = Int(tb * sr); if k < Int(tout.frameLength) && tb < bFin { v += src[k] * Float(g) }
    }
    // Les 0,4 dernières secondes se referment
    if t > DUREE - 0.4 { v *= Float((DUREE - t) / 0.4) }
    out[c][i] = v
  }
}

// Le filtre « vieille radio » : passe-haut 550 Hz puis passe-bas 2 600 Hz, jusqu'au drop.
struct Biquad {
  var b0, b1, b2, a1, a2: Double; var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
  init(passeHaut: Bool, f: Double, sr: Double, q: Double = 0.707) {
    let w = 2 * Double.pi * f / sr, al = sin(w) / (2 * q), cw = cos(w), a0 = 1 + al
    if passeHaut { b0 = (1 + cw) / 2 / a0; b1 = -(1 + cw) / a0; b2 = b0 }
    else { b0 = (1 - cw) / 2 / a0; b1 = (1 - cw) / a0; b2 = b0 }
    a1 = -2 * cw / a0; a2 = (1 - al) / a0
  }
  mutating func f(_ x: Double) -> Double {
    let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y; return y
  }
}
let finFiltre = Int((DROP + 0.02) * sr), departOuverture = DROP - 0.08
for c in 0..<2 {
  var hp = Biquad(passeHaut: true, f: 550, sr: sr), lp = Biquad(passeHaut: false, f: 2600, sr: sr)
  var hp2 = Biquad(passeHaut: true, f: 550, sr: sr), lp2 = Biquad(passeHaut: false, f: 2600, sr: sr)
  for i in 0..<finFiltre {
    let t = Double(i) / sr, x = Double(out[c][i])
    let y = lp2.f(lp.f(hp2.f(hp.f(x)))) * 1.35
    let m = t < departOuverture ? 1.0 : max(0, (DROP + 0.02 - t) / 0.1)
    out[c][i] = Float(y * m + x * (1 - m))
  }
}

let fmtSortie = AVAudioFormat(standardFormatWithSampleRate: sr, channels: 2)!
let buf = AVAudioPCMBuffer(pcmFormat: fmtSortie, frameCapacity: AVAudioFrameCount(nOut))!
buf.frameLength = AVAudioFrameCount(nOut)
for c in 0..<2 { out[c].withUnsafeBufferPointer { buf.floatChannelData![c].update(from: $0.baseAddress!, count: nOut) } }
do {
  let ecrit = try AVAudioFile(forWriting: sonSeul, settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: sr,
    AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 192000], commonFormat: .pcmFormatFloat32, interleaved: false)
  try ecrit.write(from: buf)
}
print("son : 30 s écrits")

// ───────────────────────── Les images ─────────────────────────
func charger(_ u: URL) -> CGImage {
  let s = CGImageSourceCreateWithURL(u as CFURL, nil)!; return CGImageSourceCreateImageAtIndex(s, 0, nil)!
}
let noms = try FileManager.default.contentsOfDirectory(atPath: dossier).filter { $0.contains(", plan ") && $0.hasSuffix(".png") }.sorted()
precondition(noms.count == 10, "il faut les 10 planches")
let planches = noms.map { charger(URL(fileURLWithPath: dossier).appendingPathComponent($0)) }
let logo = charger(logoURL), vague = charger(vagueURL)
/// La planche 10 sans son packshot isolé : on ne garde que le personnage et la boîte qu'il tient.
let personnage = planches[9].cropping(to: CGRect(x: 0, y: 0, width: Int(Double(planches[9].width) * 0.645), height: planches[9].height))!

let ROUGE = CGColor(red: 0.85, green: 0.07, blue: 0.11, alpha: 1)
let ROUGE_SOMBRE = CGColor(red: 0.55, green: 0.03, blue: 0.06, alpha: 1)
let BLANC = CGColor(red: 1, green: 1, blue: 1, alpha: 1)

func lisse(_ x: Double) -> Double { let u = min(max(x, 0), 1); return u * u * (3 - 2 * u) }
func sortieDos(_ x: Double) -> Double { let u = min(max(x, 0), 1) - 1, s = 1.9; return 1 + u * u * ((s + 1) * u + s) }
func entree(_ x: Double) -> Double { let u = min(max(x, 0), 1); return u * u * u }
func bruit(_ t: Double, _ g: Double) -> Double { sin(t * 37.1 + g) * 0.6 + sin(t * 53.7 + 1.3 * g) * 0.4 }
/// La pulsation sur le temps, plus forte sur le premier temps de la mesure.
func pulse(_ t: Double) -> Double {
  guard t >= DROP else { return 0 }
  let p = (t - DROP).truncatingRemainder(dividingBy: TEMPS), fort = Int((t - DROP) / TEMPS) % 4 == 0
  return (fort ? 0.03 : 0.014) * exp(-p * 14)
}

/// Dessine une planche plein cadre, mise à l'échelle autour d'un point focal (fractions de l'image, origine en bas).
func planche(_ cx: CGContext, _ im: CGImage, s: Double, focal: (Double, Double) = (0.5, 0.5),
             dx: Double = 0, dy: Double = 0, rot: Double = 0, alpha: Double = 1, rect: CGRect? = nil) {
  let r = rect ?? CGRect(x: 0, y: 0, width: W, height: H)
  let ech = max(r.width / CGFloat(im.width), r.height / CGFloat(im.height))
  let w = CGFloat(im.width) * ech, h = CGFloat(im.height) * ech
  let fx = r.minX + CGFloat(focal.0) * r.width, fy = r.minY + CGFloat(focal.1) * r.height
  cx.saveGState(); cx.clip(to: r); cx.setAlpha(CGFloat(alpha))
  cx.translateBy(x: fx + CGFloat(dx), y: fy + CGFloat(dy)); cx.rotate(by: CGFloat(rot)); cx.scaleBy(x: CGFloat(s), y: CGFloat(s))
  cx.translateBy(x: -fx, y: -fy)
  cx.interpolationQuality = .high
  cx.draw(im, in: CGRect(x: r.midX - w / 2, y: r.midY - h / 2, width: w, height: h))
  cx.restoreGState()
}

func ligne(_ texte: String, _ police: String, _ taille: CGFloat, _ couleur: CGColor) -> (CTLine, CGRect) {
  let f = CTFontCreateWithName(police as CFString, taille, nil)
  let a = NSAttributedString(string: texte, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): f,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): couleur])
  let l = CTLineCreateWithAttributedString(a)
  return (l, CTLineGetBoundsWithOptions(l, .useOpticalBounds))
}

/// Un texte sur son pavé, qui « pop » : centre (x, y), échelle, rotation.
func etiquette(_ cx: CGContext, _ texte: String, police: String, taille: CGFloat, couleur: CGColor, fond: CGColor?,
               x: CGFloat, y: CGFloat, ech: Double, rot: Double = 0, marge: CGFloat = 18, alpha: Double = 1, rayon: CGFloat = 8) {
  guard ech > 0.001, alpha > 0.001 else { return }
  let (l, b) = ligne(texte, police, taille, couleur)
  cx.saveGState(); cx.setAlpha(CGFloat(alpha))
  cx.translateBy(x: x, y: y); cx.rotate(by: CGFloat(rot)); cx.scaleBy(x: CGFloat(ech), y: CGFloat(ech))
  if let fond = fond {
    let p = CGRect(x: -b.width / 2 - marge, y: -b.height / 2 - marge * 0.6, width: b.width + 2 * marge, height: b.height + marge * 1.2)
    cx.setFillColor(fond); cx.addPath(CGPath(roundedRect: p, cornerWidth: rayon, cornerHeight: rayon, transform: nil)); cx.fillPath()
  }
  cx.textPosition = CGPoint(x: -b.width / 2 - b.minX, y: -b.height / 2 - b.minY)
  CTLineDraw(l, cx)
  cx.restoreGState()
}

func voile(_ cx: CGContext, _ c: CGColor, _ a: Double) {
  guard a > 0.001 else { return }
  cx.saveGState(); cx.setAlpha(CGFloat(min(a, 1))); cx.setFillColor(c); cx.fill(CGRect(x: 0, y: 0, width: W, height: H)); cx.restoreGState()
}

// Les coupes, toutes sur des temps forts du morceau.
let coupes: [Double] = [0, 3.16, DROP, DROP + MESURE, DROP + 2 * MESURE, DROP + 3 * MESURE, DROP + 4 * MESURE,
                        DROP + 5 * MESURE, DROP + 8 * MESURE, DROP + 12 * MESURE, DUREE]
let FINALE = 28.57          // le dernier coup du morceau
let POLICE = "Futura-CondensedExtraBold", SNAP = "HelveticaNeue-Bold"

func image(_ cx: CGContext, _ t: Double) {
  cx.setFillColor(BLANC); cx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  let n = (coupes.lastIndex { $0 <= t } ?? 0).clamped(0, 9)
  let u = t - coupes[n], d = coupes[n + 1] - coupes[n], im = planches[n], pu = pulse(t)
  let sens: Double = n % 2 == 0 ? 1 : -1
  // L'arrivée de chaque plan après le drop : un coup de fouet horizontal de trois images.
  let fouet = (n >= 3 && n <= 8 && n != 8 && u < 0.1) ? sens * Double(W) * 0.12 * pow(1 - u / 0.1, 2) : 0

  switch n {
  case 0:  // Réveil en selfie : main tenue, la légende façon story.
    planche(cx, im, s: 1.04 + 0.05 * u / d, dx: 6 * sin(t * 2.1), dy: 4 * sin(t * 1.7), rot: 0.006 * sin(t * 1.3))
    let a = lisse((u - 0.35) / 0.15)
    if a > 0 {
      cx.saveGState(); cx.setAlpha(CGFloat(a * 0.55)); cx.setFillColor(CGColor(gray: 0, alpha: 1))
      cx.fill(CGRect(x: 0, y: 236, width: W, height: 58)); cx.restoreGState()
      etiquette(cx, "quand le son de ta mère passe en drill", police: SNAP, taille: 30, couleur: BLANC, fond: nil,
                x: CGFloat(W) / 2, y: 265, ech: 1, alpha: a)
    }
  case 1:  // La boîte en micro : on fonce sur la boîte, ça tremble jusqu'au drop.
    let k = entree(u / d), tr = 9 * k * k
    planche(cx, im, s: 1.06 + 0.2 * k, focal: (0.74, 0.32), dx: tr * bruit(t, 1), dy: tr * bruit(t, 2))
  case 2:  // Le drop : coup de zoom, secousse qui s'amortit.
    let tr = 16 * exp(-u * 4)
    planche(cx, im, s: 1.0 + 0.2 * exp(-u * 7) + pu, dx: tr * bruit(t, 3), dy: tr * bruit(t, 4))
  case 3:  // Le gbaka : panoramique.
    planche(cx, im, s: 1.1 + pu, dx: -40 + 80 * lisse(u / d) + fouet)
  case 4:  // Le lait dans le café : on entre dans la tasse.
    planche(cx, im, s: 1.04 + 0.16 * lisse(u / d) + pu, focal: (0.4, 0.28), dx: fouet)
  case 5:  // La course pour la fac : panoramique inverse.
    planche(cx, im, s: 1.1 + pu, dx: 40 - 80 * lisse(u / d) + fouet)
  case 6:  // Le rire de la tantie : on recule.
    planche(cx, im, s: 1.18 - 0.12 * lisse(u / d) + pu, focal: (0.62, 0.62), dx: fouet)
  case 7:  // Le refrain en famille : la phrase tombe sur les temps.
    planche(cx, im, s: 1.02 + 0.08 * u / d + pu)
    let p1 = sortieDos((u - 0.05) / 0.28)
    etiquette(cx, "BONNET ROUGE", police: POLICE, taille: 96, couleur: BLANC, fond: ROUGE, x: 330, y: 170,
              ech: p1, rot: -0.035, marge: 22)
    let mots = ["pour", "l'énergie", "dès", "le", "matin"]
    var x: CGFloat = 92
    for (i, m) in mots.enumerated() {
      let tm = 2 * TEMPS + Double(i) * TEMPS, a = sortieDos((u - tm) / 0.22)
      let (_, b) = ligne(m, POLICE, 54, BLANC)
      etiquette(cx, m, police: POLICE, taille: 54, couleur: BLANC, fond: ROUGE_SOMBRE, x: x + b.width / 2 + 12, y: 78,
                ech: a, marge: 12, rayon: 4)
      x += b.width + 30
    }
  case 8:  // Trois créateurs : les trois cadres montent un à un, puis battent la mesure.
    let bords: [Double] = [0, 0.32, 0.678, 1]
    for i in 0..<3 {
      let r = CGRect(x: CGFloat(bords[i]) * CGFloat(W), y: 0, width: CGFloat(bords[i + 1] - bords[i]) * CGFloat(W), height: CGFloat(H))
      let ti = Double(i) * 2 * TEMPS, k = sortieDos((u - ti) / 0.35)
      guard k > 0.001 else { continue }
      let src = im.cropping(to: CGRect(x: Double(im.width) * bords[i], y: 0, width: Double(im.width) * (bords[i + 1] - bords[i]),
                                       height: Double(im.height)))!
      let battement = (Int((t - DROP) / TEMPS) % 3 == i) ? pu * 2.2 : 0
      cx.saveGState(); cx.translateBy(x: 0, y: CGFloat((1 - k) * -Double(H))); cx.clip(to: r)
      planche(cx, src, s: 1.03 + battement + 0.03 * u / d, rect: r)
      cx.restoreGState()
      cx.setFillColor(BLANC); cx.fill(CGRect(x: r.maxX - 3, y: 0, width: 6, height: CGFloat(H)))
    }
    let h = sortieDos((u - MESURE) / 0.3)
    etiquette(cx, "#DèsLeMatin", police: POLICE, taille: 70, couleur: ROUGE, fond: BLANC, x: CGFloat(W) / 2, y: 96,
              ech: h * (1 + pu * 1.5), rot: -0.07, marge: 20, rayon: 12)
  default:  // Final : le personnage seul, sa boîte en main (le packshot isolé de la planche est retiré),
           // agrandi ; le logotype, puis la vague signature passe par-dessus l'image sur le dernier coup.
    let k = lisse((t - FINALE + 0.12) / 0.35)
    // Calé à gauche, tête entière en haut ; le bord droit du recadrage tombe dans le blanc du papier.
    let ph = 980 * (1 + 0.04 * lisse(u / d)), pw = ph * Double(personnage.width) / Double(personnage.height)
    cx.interpolationQuality = .high
    cx.draw(personnage, in: CGRect(x: -(ph - 980) * 0.3, y: Double(H) - ph + 12, width: pw, height: ph))
    let l = sortieDos((u - 0.5) / 0.3)
    if l > 0.001 {
      let lw = 225.0 * l, lh = lw * Double(logo.height) / Double(logo.width)
      cx.draw(logo, in: CGRect(x: 160 - lw / 2, y: 630 - lh / 2, width: lw, height: lh))
    }
    if k > 0 {
      let vh = Double(W) * Double(vague.height) / Double(vague.width)
      cx.draw(vague, in: CGRect(x: 0, y: -110 - (1 - sortieDos(k)) * 330, width: Double(W), height: vh))
    }
  }

  // Les éclairs : avant et après le drop, à chaque coupe ensuite, et sur le dernier coup.
  var e = 0.0
  if t > DROP - 0.1 && t < DROP { e = (t - (DROP - 0.1)) / 0.1 * 0.8 }
  if t >= DROP && t < DROP + 0.3 { e = 1 - (t - DROP) / 0.3 }
  if n >= 3 && u < 0.07 { e = max(e, 0.35 * (1 - u / 0.07)) }
  if t >= FINALE && t < FINALE + 0.15 { e = max(e, 0.5 * (1 - (t - FINALE) / 0.15)) }
  voile(cx, BLANC, e)
  if t > DUREE - 0.2 { voile(cx, BLANC, (t - (DUREE - 0.2)) / 0.2 * 0.0) }
}

extension Int { func clamped(_ a: Int, _ b: Int) -> Int { Swift.min(Swift.max(self, a), b) } }

// ───────────────────────── L'écriture de la vidéo ─────────────────────────
let ecrivain = try AVAssetWriter(outputURL: videoSeule, fileType: .mp4)
let entreeVideo = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: Int(ProcessInfo.processInfo.environment["DEBIT"] ?? "") ?? 3_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
entreeVideo.expectsMediaDataInRealTime = false
let adaptateur = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: entreeVideo, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
ecrivain.add(entreeVideo); ecrivain.startWriting(); ecrivain.startSession(atSourceTime: .zero)

let total = Int(DUREE) * FPS
var apercus: [Int: String] = [45: "apercu-plan01.jpg", 165: "apercu-drop.jpg", 450: "apercu-refrain.jpg", 660: "apercu-createurs.jpg", 885: "apercu-final.jpg"]
for f in 0..<total {
  while !entreeVideo.isReadyForMoreMediaData { usleep(2000) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptateur.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let cx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8,
                     bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(),
                     bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue)!
  image(cx, Double(f) / Double(FPS))
  if let nom = apercus[f], let img = cx.makeImage() {
    let dest = CGImageDestinationCreateWithURL(travail.appendingPathComponent(nom) as CFURL, "public.jpeg" as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary); CGImageDestinationFinalize(dest)
  }
  CVPixelBufferUnlockBaseAddress(pb!, [])
  adaptateur.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: CMTimeScale(FPS)))
}
entreeVideo.markAsFinished()
let fini = DispatchSemaphore(value: 0)
ecrivain.finishWriting { fini.signal() }; fini.wait()
precondition(ecrivain.status == .completed, "vidéo : \(String(describing: ecrivain.error))")
print("image : \(total) images écrites")

// ───────────────────────── L'assemblage ─────────────────────────
let compo = AVMutableComposition()
let va = AVURLAsset(url: videoSeule), aa = AVURLAsset(url: sonSeul)
let plage = CMTimeRange(start: .zero, duration: CMTime(seconds: DUREE, preferredTimescale: 600))
let pistes = DispatchSemaphore(value: 0)
Task {
  let vt = try await va.loadTracks(withMediaType: .video).first!, at = try await aa.loadTracks(withMediaType: .audio).first!
  let cv = compo.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
  let ca = compo.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
  let dureeSon = try await aa.load(.duration)
  try cv.insertTimeRange(plage, of: vt, at: .zero)
  try ca.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(dureeSon, plage.duration)), of: at, at: .zero)
  let ex = AVAssetExportSession(asset: compo, presetName: AVAssetExportPresetPassthrough)!
  ex.outputURL = sortie; ex.outputFileType = .mp4; ex.shouldOptimizeForNetworkUse = true
  await ex.export()
  if ex.status != .completed { print("assemblage : \(String(describing: ex.error))") }
  pistes.signal()
}
pistes.wait()
for u in [videoSeule, sonSeul] { try? FileManager.default.removeItem(at: u) }
print("montage : \(sortie.path)")
