use candid::Principal;

fn main() {
    // Convert text IDs to byte slices for use in constants
    let text_ids = [
        "xevnm-gaaaa-aaaar-qafnq-cai", // ckUSDC
        "cngnf-vqaaa-aaaar-qag4q-cai", // ckUSDT
        "mxzaz-hqaaa-aaaar-qaada-cai", // ckBTC
    ];

    for id in text_ids {
        let principal = Principal::from_text(id).unwrap();
        let bytes = principal.as_slice();

        println!("// {}", id);
        println!("&[");
        for byte in bytes {
            println!("    {},", byte);
        }
        println!("]");
    }
}
