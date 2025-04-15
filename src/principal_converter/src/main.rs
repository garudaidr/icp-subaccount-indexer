use candid::Principal;

fn main() {
    // Convert text IDs to byte slices for use in constants
    let text_ids = ["xevnm-gaaaa-aaaar-qafnq-cai", "cngnf-vqaaa-aaaar-qag4q-cai"];

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
