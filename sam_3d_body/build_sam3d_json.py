#!/usr/bin/env python3
"""Build a SAM3D pose JSON (the format demo_video.py emits with
--include_vertices_in_pose_json) from a directory of per-frame raw_outputs npz.

We have raw_outputs/frame_*.npz that contain every field
convert_sam3d_json_to_smpl.py needs. Pack them into one JSON.
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np


REQUIRED_FIELDS = (
    "mhr_model_params",
    "shape_params",
    "expr_params",
    "pred_cam_t",
    "pred_vertices",
)

OPTIONAL_FIELDS = (
    "bbox",
    "body_pose_params",
    "hand_pose_params",
    "global_rot",
    "pred_global_rots",
    "pred_joint_coords",
    "pred_keypoints_2d",
    "pred_keypoints_3d",
    "scale_params",
)


def list_to_python(arr: np.ndarray):
    return arr.astype(np.float32).tolist()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1].parent / "sam" / "output" / "raw_outputs",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1].parent / "sam_3d_smpl_workspace" / "sam3d_pose.json",
    )
    parser.add_argument("--fps", type=float, default=15.0)
    parser.add_argument("--input-fps", type=float, default=15.0)
    parser.add_argument("--frame-stride", type=int, default=1)
    parser.add_argument(
        "--include-extras",
        action="store_true",
        help="Also serialise non-required arrays (bigger JSON).",
    )
    args = parser.parse_args()

    raw_dir = args.raw_dir.resolve()
    files = sorted(raw_dir.glob("frame_*.npz"))
    if not files:
        sys.exit(f"No frame_*.npz under {raw_dir}")

    frames = []
    for npz_path in files:
        try:
            frame_index = int(npz_path.stem.split("_")[-1])
        except ValueError:
            continue
        with np.load(npz_path, allow_pickle=False) as data:
            person = {"person_id": 0}
            missing = []
            for key in REQUIRED_FIELDS:
                if key not in data.files:
                    missing.append(key)
                    continue
                person[key] = list_to_python(data[key])
            if missing:
                sys.exit(f"{npz_path.name} missing required fields: {missing}")
            if args.include_extras:
                for key in OPTIONAL_FIELDS:
                    if key in data.files:
                        person[key] = list_to_python(data[key])
        frames.append(
            {
                "frame_index": frame_index - 1,  # demo_video.py uses 0-based
                "time_sec": (frame_index - 1) / args.input_fps,
                "people": [person],
            }
        )

    payload = {
        "video_path": "",
        "fps": args.fps,
        "input_fps": args.input_fps,
        "frame_stride": args.frame_stride,
        "source_representation": "MHR",
        "smpl_note": "Built from raw_outputs/frame_*.npz; not native SMPL.",
        "keypoint_format": "mhr70",
        "contains_vertices": True,
        "faces": None,
        "frames": frames,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    size_mb = args.output.stat().st_size / (1024 * 1024)
    print(f"wrote {args.output} · {len(frames)} frames · {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
