/**
 * A flat Brunei daylight sky: a bright blue wash with a soft sun and two banks of
 * clouds that drift sideways at their own slow speeds as the camera travels.
 */
const CLOUDS_FAR =
  "radial-gradient(44px 14px at 30px 24px, rgba(255,255,255,0.95) 0 58%, rgba(255,255,255,0) 74%)," +
  "radial-gradient(28px 10px at 78px 19px, rgba(255,255,255,0.8) 0 58%, rgba(255,255,255,0) 74%)," +
  "radial-gradient(52px 16px at 160px 30px, rgba(255,255,255,0.88) 0 58%, rgba(255,255,255,0) 74%)";

const CLOUDS_NEAR =
  "radial-gradient(64px 19px at 62px 33px, rgba(255,255,255,0.96) 0 56%, rgba(255,255,255,0) 72%)," +
  "radial-gradient(38px 13px at 124px 24px, rgba(255,255,255,0.84) 0 56%, rgba(255,255,255,0) 72%)," +
  "radial-gradient(72px 21px at 248px 37px, rgba(255,255,255,0.92) 0 56%, rgba(255,255,255,0) 72%)";

export default function DerbySky({ cameraX = 0, height = 46 }) {
  const pan = cameraX * 0.1;

  return (
    <div
      className="absolute inset-x-0 top-0 overflow-hidden"
      style={{
        height,
        background: "linear-gradient(180deg,#4aa8e8 0%,#84c8f2 52%,#d8eefb 100%)",
      }}
    >
      <div
        className="absolute -right-7 -top-9 h-24 w-24 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,249,222,0.95) 0%, rgba(255,249,222,0.32) 44%, rgba(255,249,222,0) 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: CLOUDS_FAR,
          backgroundSize: "214px 100%",
          backgroundRepeat: "repeat-x",
          backgroundPosition: `${-pan * 0.45}px 0`,
          opacity: 0.92,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: CLOUDS_NEAR,
          backgroundSize: "300px 100%",
          backgroundRepeat: "repeat-x",
          backgroundPosition: `${-pan * 1.1}px 0`,
        }}
      />
    </div>
  );
}